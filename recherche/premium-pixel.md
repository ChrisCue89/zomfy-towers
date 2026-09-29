# Was Pixel- und Voxelspiele hochwertig wirken lässt – Recherche für Zomfy Towers

Stand: 29.09.2026 · **Zur Methode:** Websuche; der Seitenabruf war in dieser Umgebung
für fast alle Seiten gesperrt (nur GitHub ging). Die Aussagen stützen sich deshalb
auf Suchergebnis-Auszüge, den veröffentlichten Celeste-Quellcode und einen Blick
ins eigene Repository. Was aus Vorwissen stammt, ist mit **(VW)** markiert,
eigene Vorschläge mit **(Vorschlag)**. Quellen stehen am Ende, im Text als [Kürzel].

## Kernbefunde

- Hochwertig wirkt nicht mehr Auflösung, sondern **Konsequenz**: Jede Aktion
  antwortet in Bild, Klang und Kamera; die Pixelregeln gelten überall; nichts
  ruckelt. Eine Auswertung von Steam-Rezensionen fand Trefferstopp, stimmigen
  Klang und Kameraführung als die drei stärksten Treiber des Wucht-Gefühls –
  fehlt einer davon, kippt der Eindruck [S1].
- Die großen Pixelspiele leben vom **Licht**: HD-2D (Punktlichter werfen
  Schatten der Sprites, volumetrischer Nebel) [B1], Sea of Stars (Licht „zu 100 %
  dynamisch“ statt Palettentausch) [B2], Eastward (3D-Licht über handgemalte
  Bump-Maps) [B3]. Zomfys Lichtinseln sind die richtige Grundlage – sie müssen
  nur leben.
- **Gemütlichkeit braucht die Gefahr draußen:** Project Horseshoe beschreibt
  Coziness als Sicherheit, Fülle und Weichheit; Bedrohungen verstärken sie,
  solange sie sicher außerhalb des gemütlichen Raums bleiben [C1]. Das ist genau
  Zomfys Wall-und-Tor-Prinzip. Dredge setzt auf denselben Kontrast: entwaffnend
  friedliche Tage, unruhige Nächte [B9].
- Premium-Momente sind **inszenierte Schwellen** (Wellenbeginn, Durchbruch,
  Morgen): Vorwarnung, Takt, Stille, Leitmotiv [E1–E4].

## 0. Die Vorbilder in einer Zeile

| Spiel | Was es hochwertig macht | Übertrag auf Zomfy |
|---|---|---|
| Octopath / Triangle Strategy | Dynamisches Licht, Tiefenunschärfe, Tilt-Shift, volumetrischer Nebel; Punktlichter werfen Sprite-Schatten; Dioramawirkung [B1] | Tiefe **ohne** Unschärfe (siehe Top 10, Nr. 6) |
| Sea of Stars | Schatten wandern mit dem Licht, Magie erhellt die Umgebung, Figuren glühen im Dunkeln, Wasser spiegelt Lichtquellen [B2] | Spiegelsäulen von Laternen und Feuer im See |
| Eastward | Pixelkunst in 3D zerlegt, Bump-Maps von Hand, eigene Engine [B3] | Voxel haben echte Normalen: Randlicht nahe den Lichtinseln |
| Hyper Light Drifter | 480×270, 4× auf 1080p; Bildzahl je Animation nach Bedarf; flache Farben mit großen Verläufen; ganz ohne Text erzählt [B4, E5] | Erinnerungswand als wortlose Bildtafeln |
| Dead Cells | 3D-Modelle klein, ohne Glättung gerendert; erst Schlüsselposen mit möglichst wenig Bildern, dann Zwischenbilder; Rückmeldung nach Prügelspiel-Vorbild: Standbilder, Zeitlupe, Partikel [B5] | Schlüsselposen halten, Zwischenposen sparsam |
| Celeste | Kulanz (0,1 s Coyote-Zeit, 4 px Eckenkorrektur), Dash mit 3 Standbildern, Partikelstöße mit 4/8/16 Teilchen, Richtungswackeln 0,1 s [G5, G6] | Eingabepuffer, Partikelstufen |
| Blasphemous | Puristisch handgepixelte Animationen [B6] | Seltene Sonderanimationen für große Momente |
| CrossCode | Politur bis zum „einen Pixel in der Oberfläche“ [B7] | Oberflächen-Politur |
| Stardew Valley | Tagespläne der Figuren, Regentage ändern Abläufe (VW) | Bewohner mit Tagesplan und Wetterverhalten |
| Moonlighter | Tag Laden, Nacht Dungeon; Kundengesichter in fünf Stufen von begeistert bis wütend [B8] | Emote-Blasen der Bewohner |
| Dredge | Nebel und Tag-Nacht schon im ersten Prototyp; Atmosphäre statt Schockeffekte [B9] | bestätigt Säule 2 („ruhige Tage“) |
| Cult of the Lamb | Niedlich-dunkel; Anhänger mit 1–3 Eigenschaften; Würfelspiel gegen Gegner mit Persönlichkeit und Einsatzgrenze [B10] | Charakterzüge, Kartengegner |
| Teardown | 8-Bit-Palette mit Materialwerten (Rauheit, Eigenlicht, Spiegelung, Materialart); Rauch per Blaurauschen-Rasterdurchsicht mit wechselnden Normalen (scheinbare Lichtstreuung); Partikel mit gerundeten Normalen [B11] | Palette um Materialwerte erweitern; Rauch/Staub gerastert und von Lichtinseln beleuchtet |
| A Short Hike | „Schöne 3D-Welt mit so wenig Pixeln wie möglich“: flache Schattierung ohne Kantenglättung, weicher Umriss für Lesbarkeit, Herbstpalette aus Landschaftsfotos gepickt, Pixelgröße einstellbar [B12] | Palette gegen Referenzfotos prüfen |
| 3D-Pixelkunst (t3ssel8r-Stil) | 1-px-Umrisse, Kantenlicht nur an konvexen Kanten, Kamera rastet (bei Ortho exakt) [B13] | macht Zomfy schon – beibehalten |

## 1. Merkmale „Triple-A-Pixel“ gegenüber gutem Indie – nach Wirkung/Aufwand

W = Wirkung, A = Aufwand (1 gering … 3 hoch). Sortiert nach W/A.

| # | Merkmal | Beleg | W | A |
|---|---|---|---|---|
| 1 | Jede Aktion antwortet mehrkanalig (Bild, Klang, Kamera, Spur) | [G1, G2] | 3 | 1 |
| 2 | Trefferstopp nach Wucht gestaffelt | [G3, S1] | 3 | 1 |
| 3 | Klang stimmig und variiert (Schichten, Tonhöhe) | [S1] | 3 | 1 |
| 4 | Information nie über Farbe allein (Form, Symbol, Muster) | [A2] | 3 | 1 |
| 5 | Eiserne Pixelregeln: ganzzahlig, keine gedrehten Pixel, eine Pixelgröße je Ebene | [B4, B12] | 3 | 1 (✓ weitgehend) |
| 6 | Tiefenstaffelung ohne Unschärfe (Luftperspektive, Dunst, gerasterte Vignette) | [B1] | 3 | 1 |
| 7 | Inszenierte Schwellen (Vorwarnung, Banner, Stinger, Stille) | [E1, E2] | 3 | 1–2 |
| 8 | Stabile Bildzeiten, kein Hänger beim ersten Effekt, kurze Ladezeit | [L1, L2] | 3 | 2 |
| 9 | Lebendiges Licht (Flackern, Funken, Fensterlicht, Randlicht) | [B2, B3] | 3 | 2 |
| 10 | Vorbereitung – Aktion – Nachschwung; Gegner telegrafieren länger als die eigene Figur | [B5, G11] | 3 | 2 |
| 11 | Idle-Leben und kleine Reaktionen (Blinzeln, Blicke, Emotes) | [B8, C2] | 3 | 2 |
| 12 | Oberfläche mit Zuständen und Bewegung (Hover, Druck, Übergänge, hochzählende Zahlen) | [K2, B7] | 3 | 2 |
| 13 | Adaptive Musik mit Leitmotiven | [E3, E4] | 3 | 2 |
| 14 | Kulanz in der Steuerung (Puffer, Toleranzfenster) | [G5, G6] | 2 | 1 |
| 15 | Kamera mit Absicht (Trauma-Wackeln, weiches Nachführen) | [G4] | 2 | 1 |
| 16 | Spuren bleiben („Permanenz“) | [G2] | 2 | 1 |
| 17 | Zugänglichkeit (Wackeln/Blitze abschaltbar, Schriftgröße, Tempo, Tastenbelegung, Untertitel für Warnklänge) | [A1–A3] | 2 | 1–2 |
| 18 | Diegetische Oberfläche in Sonderszenen | [K1] | 2 | 2 |
| 19 | Materialwerte in der Palette (Glanz, Eigenlicht je Farbe) | [B11] | 2 | 2 |
| 20 | Wasser, das Lichtquellen spiegelt | [B2] | 2 | 2 |
| 21 | Wortloses Erzählen in Bildern | [E5] | 2 | 2 |
| 22 | Handgemachte Einzelmomente (Umarmung, Sonderanimation) | [C2, B6] | 3 | 3 |

Die Punkte 1–8 sind fast reine Tuning- und Politurarbeit an Systemen, die Zomfy
schon hat. 20–22 sind teuer, aber das, woran man sich erinnert.

## 2. Game-Feel-Checkliste mit Zahlen

Bei 60 Bildern/s ist ein Bild 16,7 ms. Die Werte sind Startpunkte; am besten als
eine Tabelle „Rückmeldung je Ereignis“ in `src/data/` ablegen.

| Bereich | Richtwert | Beleg | Stand Zomfy |
|---|---|---|---|
| Eingabe → sichtbare Antwort | im selben/nächsten Bild (≤ 33 ms); ganze Schleife < 100 ms | [G8]; Nielsen 0,1 s [U1] (VW) | – |
| Kulanz/Puffer | 80–150 ms (Celeste: `JumpGraceTime = 0.1`, Eckenkorrektur 4 px) | [G5] | Tasten bleiben im Trefferstopp liegen ✓ |
| Trefferstopp leicht | 30–50 ms (2–3 Bilder); Praxiswert 0,05 s | [G9] | 50 ms ✓ |
| Trefferstopp schwer | 80–150 ms; Final Fight pauschal 6 Bilder (100 ms), SF V geblockt: leicht 8, mittel 12 Bilder; Praxis „schwerer Abschluss 0,15 s“ | [G9] | 70–80 ms → Pfanne, Wirbel, Bosstreffer auf 100–150 ms |
| Trefferstopp Finale | 150–250 ms plus 0,3–0,5 s Zeitlupe (Vorschlag); Sakurai: mehr Wucht = längerer Stopp | [G3] | – |
| Treffer von Türmen | nie global anhalten; nur der getroffene Schlurfer friert 2–3 Bilder ein und zittert 1 px (Vorschlag; Zittern im Hitlag wie in Smash, VW) | [G10] | – |
| Wackeln, Modell | Trauma 0–1, Ausschlag = Trauma² (oder ³), Perlin-Rauschen statt Zufall; Abklingen in ~0,5–1 s (Vorschlag) | [G4] | fester 1-px-Kreis (`JITTER`), 0,12–0,18 s |
| Wackeln in Pixeln (80 px/m) | leicht 1 px, mittel 2–3, schwer 4–6, Tor fällt/Boss 6–8; nur ganze Pixel, keine Drehung (Gier bleibt 0), bei Treffern gerichtet („camera kick“) | [G2, G6] (Pixelwerte: Vorschlag) | – |
| Aufblitzen | Ziel 1–2 Bilder weiß; Vollbild-Blitze höchstens 3 pro Sekunde | [A2] | Ziel ✓, Laternenblitz prüfen |
| Partikel je Ereignis | klein 3–6, mittel 8–12, groß 16–30, Explosion 30–60; Trümmer 2–5 s liegen lassen | Celeste 4/8/16 [G5]; Permanenz [G2] | – |
| Eigene Figur | Ausholen 50–100 ms, ein Wischbild, Nachschwung 100–250 ms (Vorschlag) | Schlüsselposen zuerst [B5] | – |
| Gegner | Ausholen ≥ 0,4 s, Boss 0,8–1,5 s mit Warnkreis und Klang; menschliche Reaktionszeit ≈ 0,2–0,25 s (VW) | [G11] | Warnkreis ✓ |
| Idle | Atmen 1 Voxel alle 2–4 s, Blinzeln alle 2–6 s (≈ 120 ms), Idle-Variante alle 8–15 s (Vorschlag); 2D-Idles meist 2 Bilder à 200–400 ms | [G12] | Blinzeln ✓ |
| Klang | im selben Bild wie das Ereignis; 3–5 Varianten, Tonhöhe ±5 %, Lautstärke ±2 dB (VW); Anschlag + Körper + Nachhall; Musik für Stinger um 6–10 dB ducken | [S1] | `play()` variiert nicht automatisch |
| Oberfläche | Druck-Rückmeldung < 100 ms, Übergänge 150–300 ms mit Ease-out, Tooltip nach 300–500 ms (VW) | [U1] | – |
| Zahlen | 0,3–0,8 s hochzählen, Tick mit steigender Tonhöhe | [K2] | – |
| Bildzeit | Ziel p95 ≤ 16,7 ms, p99 ≤ 25 ms, kein Hänger > 50 ms im Kampf (Vorschlag); Gleichmaß zählt mehr als der Mittelwert | [L2] | späte Nächte: 11 ms Simulation, gut die Hälfte Abstandhalten „jeder mit jedem“ |
| Laden | < 10 s bis spielbar (sonst Absprung), Erst-Download ≤ 5 MB | [L1] | Shader nicht vorkompiliert; `renderer.compileAsync` ist in r186 vorhanden |
| Zeichenaufrufe | Faustregel für breite Geräte < 100; Desktop verträgt einige Hundert | [L3] | zuletzt dokumentiert (M5): 346–442 |

## 3. Inszenierung: Kartenabend und Sturmläuten

### 3.1 Kartenabend am Feuer oder Kamin („Letzte Runde“)

**Vorbilder:** Inscryption macht den Tisch zur Oberfläche – alles liegt als
Gegenstand vor dir; wer zu lange zögert, hört ungeduldiges Fingertrommeln [K1].
Balatro lässt jede Karte einzeln vortreten und zählt mit steigendem Ton hoch; die
Vorschau bleibt verborgen, damit Spannung entsteht [K2]. Gwent sollte laut CD
Projekt Entspannung ohne Kampf bieten und den Figuren neue Schichten geben [K3].
Knucklebones (Cult of the Lamb) gibt jedem Gegner Persönlichkeit, Einsatzgrenze
und eine eigene Belohnung [B10]; Wheels (Sea of Stars) unterscheidet lockere
Partien und Meisterpartien mit Spielfiguren als Preis [K4]; RDR2-Poker lebt von
Tempo und Gegnern mit Persönlichkeit [K5]. Celeste setzt ein Lagerfeuer-
Gespräch mit Antwortwahl an den Anfang von Kapitel 6 und endet es mit einem
Selfie als Andenken [E6].

**Ablauf (Vorschlag, im bestehenden Rahmen: 160 px/m, feste Lichtzahl, Rasterdurchsicht):**

1. **Einladung (0–1 s):** Essensglocke dreimal kurz; die Figuren setzen sich,
   Becher mit Dampf in der Hand. Kamera gleitet in 0,6–0,8 s auf Nah, das Feuer
   im oberen Drittel. Die Uhr steht, die Welt lebt weiter (Funken, Regen, Knopf
   schnarcht).
2. **Tisch:** große Pixelkarten auf einem Holzbrett (UI-Leinwand), oben das
   Porträt des Gegenübers mit Ausdrücken; das Feuer flackert als warme
   Randlicht-Stufe über Porträt und Karten (nur über die Intensität).
3. **Karten-Juice:** Hover hebt 2 px an und legt einen Schatten; Legen gleitet
   120–180 ms mit „Klack“, die Tonhöhe steigt mit der Platzsumme Richtung 15;
   „Fünfzehn – zu!“ = Stinger plus 6–10 Blätter; Platzen = komisches „Plopp“,
   das Gegenüber lacht warm, nie höhnisch.
4. **Denkpausen:** 0,4–1,2 s je Persönlichkeit (Juna schnell, Yusuf bedächtig).
   Die „Ticks“ (Grinsen, Mützentippen) müssen im Porträt lesbar sein. Wartet
   Mika länger als 8 s, statt Trommeln eine warme Geste (Knopf legt den Kopf auf).
5. **Aufdecken:** Platz für Platz im Takt von 300–400 ms, vor dem letzten ein
   Schlag Stille (Musik −10 dB), dann der Stinger.
6. **Tischgespräch:** alle 2–3 Züge eine Sprechblase, nie blockierend; die
   Beziehung schaltet Anekdoten frei.
7. **Nachklang:** Der Einsatz wird sichtbar (Mika trägt morgen wirklich die
   Mütze), Eintrag im Herbstbuch.

### 3.2 Sturmläuten: Die Bewohner greifen zu

**Mechanische Vorbilder:** Warcraft III „Call to Arms“ (Bauern werden für etwa
45 s zur Miliz) [E7]; die Stadtglocke in Age of Empires (alle in Deckung, erneutes
Läuten schickt sie zurück an die Arbeit) [E8]. Vorwarnung wie in Don't Starve:
Knurren wird lauter, Figuren fragen „Hast du das gehört?“, mindestens zweimal vor
dem Angriff [E2]. Plants vs. Zombies kündigt große Wellen mit Banner an und
tauscht die Musik gegen eine Horde-Fassung mit Tamburin, Gong, Becken und
schwerer Perkussion [E1].

**Ablauf (Vorschlag):**

- **Vorher (10–30 s):** Das Tor ächzt, Splitter knacken, Randmarke, Knopf knurrt.
- **Takt 1 (0–0,3 s):** Langer Druck (1 s, das Seil spannt sich) → erster
  Glockenschlag: 100–150 ms Stopp, Kamerastoß 3–4 px zur Glocke, die Musik reißt
  ab (ein Schlag Stille), eine gerasterte Bernstein-Vignette pulst **einmal**.
- **Takt 2 (0,3–1,8 s):** Fenster und Zelte gehen nacheinander an (100–200 ms
  Versatz), Türen schlagen auf, jede Figur greift ihr Werkzeug mit eigener Geste
  aus 3–5 Posen und einem Satz – zeitversetzt, nie synchron (überlappende
  Bewegung, zwölf Animationsprinzipien, VW).
- **Takt 3 (1,8–3 s):** Die Kampfschicht setzt auf dem nächsten Takteinsatz ein;
  die Glocke läutet noch 4–6-mal mit wachsendem Abstand; unten erscheinen die
  Porträts mit Lebensfaden.
- **Die Steuerung bleibt beim Spieler** – keine Zwischensequenz im Notfall.
- **Entwarnung:** zwei weiche Schläge; die Bewohner kehren erschöpft zurück
  (Schultern ein Voxel tiefer). Am Morgen Verbände und eine stille Szene.

### 3.3 Gefühl mit wenigen Pixeln – und die Erinnerungswand

- **Vereinfachung verstärkt:** Je einfacher ein Gesicht, desto mehr Menschen kann
  es meinen, und desto leichter projizieren Spielende sich hinein [E9]. Also
  wenige, klare Ausdrucksplatten und Körperhaltung (Kopf ein Voxel tiefer)
  statt mehr Detail.
- **Leitmotive:** Undertale verwebt die Melodie des Eröffnungsstücks in
  Oberwelt, Endkampf und das Schlussstück [E3]. Für Zomfy: jede Bewohnerin ein
  Motiv aus 4–6 Tönen, das die Spieluhr an ihrer Laterne spielt und das im
  Finale wiederkehrt.
- **Wortlos erzählen:** Hyper Light Drifter kommt ohne ein Wort aus und erzählt
  in Bildtafeln [E5]; in Dwarf Fortress gravieren Bewohner erlebte Ereignisse in
  Wände und setzen Gedenktafeln [E10]; Frostpunk spiegelt im Ende die
  beschlossenen Gesetze [E11]. → Die Erinnerungswand zeigt kleine Bildtafeln aus
  echten Spieldaten (Nacht, Ort, wer das Tor hielt) mit genau einer Zeile Text.
- **Stille:** Nach einem Verlust 10–20 s keine Musik, nur Wind und Wellen; die
  Schreibmaschine pausiert an Satzzeichen 150–400 ms (Vorschlag).
- **Warm bleibt warm:** Spiritfarer macht Umarmen, Kochen und Zuhören zur
  Pflege seiner Figuren [C2]; in RDR2 gehören Lagerfeuerlieder zur
  „Umgebungsmusik“ des Lagers [C3]. Für Zomfy: summende Bewohner, Becher,
  ein Lied am Fest.

## 4. Top 10: Was den Premium-Eindruck als Nächstes am stärksten hebt

1. **Rückmeldungs-Tabelle für alle Kernaktionen** (Stopp, Wackeln, Blitz,
   Partikel, Klang je Ereignis in `src/data/`). Trefferstopp, Klang und Kamera
   sind die stärksten Treiber [S1]; staffeln nach Wucht [G3]. Kleiner Aufwand –
   die Bausteine sind schon da.
2. **Wackeln nach dem Trauma-Modell** mit Richtung, ganzen Pixeln und einer
   Stufe im Menü (aus/halb/voll) [G4, A2]. Heute behandelt ein fester 1-px-Kreis
   leichte und schwere Treffer gleich.
3. **Bauen fühlt sich an:** Aufsetzen mit Stauchen und Strecken (0,85 → 1,1 → 1,0
   in ~200 ms), Staubring aus 6–10 Partikeln, variiertes Holz-„Tock“, Ausbau mit
   steigendem Klang je Stufe. Bauen ist die häufigste Aktion im Tower-Defense [G1].
4. **Stabile Bildzeiten:** Shader beim Startbild mit `renderer.compileAsync`
   vorkompilieren (in r186 vorhanden, ungenutzt); das Abstandhalten der Horde
   über ein Raster statt „jeder mit jedem“; p95/p99 im Prüfskript messen [L1, L2].
   Ein einziger Hänger kostet mehr Eindruck als zehn neue Effekte.
5. **Lichtinseln beleben:** Flackern über Rauschen (nur Intensität), aufsteigende
   Funken, Fensterlicht als Rechteck auf dem Boden, Spiegelsäulen im See,
   Randlicht an Figuren nahe am Feuer, Halos als 2–3 gerasterte Farbringe statt
   Bloom [B1–B3].
6. **Tiefe ohne Unschärfe:** Luftperspektive nach Norden (Kontrast und Sättigung
   sinken Richtung Dunstfarbe), Morgendunst in Rasterbändern, eine ganz leichte
   gerasterte Vignette – die Diorama-Wirkung von HD-2D ohne Blur [B1].
7. **Schwellen inszenieren:** Dämmerung (Lampen gehen nacheinander an), erste
   Welle (Vorwarnung, Banner, Stinger), der letzte Schlurfer der Nacht (0,3–0,5 s
   Zeitlupe plus Stinger), Durchbruch (Sturmläuten), Morgen (erst Stille, dann
   Vögel) [E1, E2, E4].
8. **Animation mit Vorbereitung und Leben:** Mikas Schlag mit Wischbild und
   Nachschwung, Schlurfer holen mindestens 0,4 s aus; Idle-Leben der Bewohner
   (Becher, Blicke zu Mika, Frösteln im Regen, Emote-Blasen wie in Moonlighter).
   Das ist zugleich das Fundament des Gemeinschaftssystems [B5, B8, C2].
9. **Oberflächen-Politur und Zugänglichkeit:** Übergänge von 150–250 ms,
   Druckzustände, Tooltips, hochzählende Zahlen, ein Klang je Knopf. Der
   Baugeist zeigt heute Grün/Rot – dazu ✓/✗ und Schraffur. Oberflächengröße
   getrennt einstellbar: Die Schrift hat 7 px Versalhöhe, also 21 px bei 1080p;
   XAG empfiehlt Text, der sich von 26 bis 52 px skalieren lässt [A1]. Dazu Blitze
   abschwächen, Tasten belegen, „E halten“ als Umschalter, Untertitel für
   Warnklänge [A2, A3].
10. **Die Welt erinnert sich:** Spuren bleiben (Brandflecken, niedergetretenes
    Gras, geflickte Bretter in anderer Farbe), die Bewohner sprechen am Morgen
    über die Nacht, die Erinnerungswand zeigt Bildtafeln mit Leitmotiven
    [G2, E3, E10].

**Reihenfolge:** 1–4 zuerst (klein, wirkt überall, schützt die Bildrate); 5–7
sind der Sprung für Screenshots und Trailer; 8–10 tragen die kommenden
Gemeinschafts-Meilensteine.

---

## Quellen

**Game Feel und Studien**
- [G1] Jonasson/Purho, „Juice It or Lose It“ (GDC Europe 2012): https://www.gdcvault.com/play/1016487/juice-it-or-lose · Video: https://www.youtube.com/watch?v=Fy0aCDmgnxg
- [G2] Nijman, „The Art of Screenshake“ (2013): https://www.youtube.com/watch?v=AJdEqssNZ-U · Aufschlüsselung: https://dkliao.itch.io/the-art-of-screenshake-recreation/devlog/451576/quick-breakdown-of-all-the-effects · https://www.bluetengu.com/2014/12/12/art-of-screenshake-experiments/
- [G3] Sakurai über Trefferstopp: https://sourcegaming.info/2015/11/11/thoughts-on-hitstop-sakurais-famitsu-column-vol-490-1/ · https://www.youtube.com/watch?v=OdVkEOzdCPw
- [G4] Eiserloh, „Juicing Your Cameras With Math“ (GDC 2016): http://www.mathforgameprogrammers.com/gdc2016/GDC2016_Eiserloh_Squirrel_JuicingYourCameras.pdf
- [G5] Celeste-Quellcode (Konstanten, Partikel, Wackeln): https://github.com/NoelFB/Celeste/blob/master/Source/Player/Player.cs
- [G6] Celeste-Dash: https://celeste.ink/wiki/Dashing · Thorson zu Kulanz: https://x.com/MaddyThorson/status/1238338574220546049 · https://maddythorson.medium.com/celeste-forgiveness-31e4a40399f1
- [G8] Swink, „Game Feel“ (Korrekturzyklus < 100 ms): https://en.wikipedia.org/wiki/Game_feel
- [G9] Trefferstopp-Werte: https://shane-sicienski.com/blog/blog-post-title-one-55pmn · http://shoryuken.com/2016/06/07/hitstop-in-street-fighter-v-kens-not-so-little-secret/ · https://paragraph.com/@repokuaaa/finding-the-weight-how-i-built-a-tactile-combat-system
- [G10] Hitlag in Smash: https://www.ssbwiki.com/Hitlag
- [G11] Telegrafieren: https://gdkeys.com/keys-to-combat-design-1-anatomy-of-an-attack/ · https://www.gamedeveloper.com/design/enemy-attacks-and-telegraphing
- [G12] Pixel-Idles (schwächere Quelle): https://www.sprite-ai.art/guides/how-to-animate-pixel-art
- [S1] Zhonghao u. a., „What Features Influence Impact Feel?“ (2022): https://faculty.washington.edu/weicaics/paper/papers/ZhonghaoLDWC2022.pdf
- [S2] Pichlmair/Johansen, „Designing Game Feel. A Survey“: https://arxiv.org/abs/2011.09201

**Bild, Licht, Voxel**
- [B1] HD-2D: https://en.wikipedia.org/wiki/HD-2D · https://www.unrealengine.com/en-US/spotlights/octopath-traveler-s-hd-2d-art-style-and-story-make-for-a-jrpg-dream-come-true · https://www.nintendolife.com/news/2022/10/octopath-traveler-ii-devs-aimed-to-make-its-hd-2d-visuals-picture-perfect
- [B2] Sea of Stars: https://sabotagestudio.com/presskits/sea-of-stars/ · https://www.megavisions.net/the-art-of-sea-of-stars-a-sea-of-pixels/
- [B3] Eastward: https://80.lv/articles/eastward-charming-chinese-pixel-art-adventure · https://www.gamedeveloper.com/art/eastward-s-creators-share-insights-on-making-pixel-art-adventures
- [B4] Hyper Light Drifter: https://www.neogaf.com/threads/hyper-light-drifter-dev-alex-preston-our-game-is-480p-and-very-intentionally-so.933838/page-3 · https://www.gamedeveloper.com/business/the-ultra-modern-stylings-of-hyper-light-drifter · https://medium.com/the-space-ape-games-experience/hyper-light-drifter-ui-breakdown-c2d9cfe0a192
- [B5] Dead Cells: https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i- · https://80.lv/articles/interview-with-the-developers-of-dead-cells
- [B6] Blasphemous: https://www.hollywoodreporter.com/movies/movie-news/blasphemous-designer-purist-approach-games-pixel-art-style-1238370/ · https://www.gameanim.com/2021/02/19/blasphemous-pixel-art-animation-time-lapses/
- [B7] CrossCode: https://www.radicalfishgames.com/presskit/sheet.php?p=crosscode
- [B8] Moonlighter: https://moonlighter.fandom.com/wiki/Selling_and_Reactions · https://www.siliconera.com/moonlighter-gouging-customers-just-right/
- [B9] Dredge: https://www.gamedeveloper.com/production/leveraging-the-unseen-to-turn-players-worst-fears-against-them-in-dredge · https://boilingsteam.com/interview-with-the-developers-of-dredge-black-salt-games-at-the-bitsummit-2023/
- [B10] Cult of the Lamb: https://gameworldobserver.com/2022/08/12/cult-of-the-lamb-interview-massive-monster · https://cult-of-the-lamb.fandom.com/wiki/Follower_traits · https://cult-of-the-lamb.fandom.com/wiki/Knucklebones
- [B11] Teardown: https://acko.net/blog/teardown-frame-teardown/ · https://juandiegomontoya.github.io/teardown_breakdown.html
- [B12] A Short Hike: https://blog.playstation.com/2021/08/05/crafting-a-tiny-open-world-a-look-behind-the-scenes-at-the-creation-of-a-short-hike/
- [B13] 3D-Pixelkunst: https://www.davidhol.land/articles/3d-pixel-art-rendering/ · https://dylanebert.com/texel-splatting/

**Gemütlichkeit**
- [C1] Project Horseshoe 2017, Coziness: https://projecthorseshoe.com/reports/featured/ph17r3.htm · https://lostgarden.com/2018/01/24/cozy-games/
- [C2] Spiritfarer: https://www.gamedeveloper.com/design/inside-the-thoughtful-design-of-thunder-lotus-i-spiritfarer-i- · https://www.toonboom.com/thunder-lotus-games-on-animating-the-afterlife-in-spiritfarer
- [C3] RDR2: https://en.wikipedia.org/wiki/Music_of_Red_Dead_Redemption_2 · https://www.shacknews.com/article/109679/exclusive-interview-campfire-chat-with-the-stars-of-red-dead-redemption-2

**Kartenspiele im Spiel**
- [K1] Inscryption: https://mercurialmedia.wordpress.com/2022/05/05/the-genius-of-inscryptions-first-act/ · https://gamerescape.com/2021/10/18/review-inscryption/
- [K2] Balatro: https://gmtk.substack.com/p/balatros-cursed-design-problem · https://blakecrosley.com/guides/design/balatro
- [K3] Gwent: https://www.gamedeveloper.com/design/how-i-the-witcher-3-s-i-card-game-within-a-game-was-brought-to-life
- [K4] Sea of Stars, Wheels: https://seaofstars.fandom.com/wiki/Wheels
- [K5] RDR2-Poker: https://outof.games/news/8982-red-dead-redemption-2-poker-tells-and-npc-patterns-guide/

**Gefühl, Musik, Notfall**
- [E1] Plants vs. Zombies: https://plantsvszombies.fandom.com/wiki/Messages · https://classapps.chass.ncsu.edu/com304/?p=2616
- [E2] Don't Starve, Hunde: https://dontstarve.wiki.gg/wiki/Hound
- [E3] Undertale, Leitmotive: https://undertale.wiki/w/Leitmotifs · https://en.wikipedia.org/wiki/Undertale_Soundtrack
- [E4] Adaptive Musik, Stinger: https://www.thegameaudioco.com/making-your-game-s-music-more-dynamic-vertical-layering-vs-horizontal-resequencing
- [E5] Hyper Light Drifter ohne Worte: https://killscreen.com/articles/building-wordless-world-hyper-light-drifter/
- [E6] Celeste, Kapitel 6: https://celestegame.fandom.com/wiki/Chapter_6:_Reflection
- [E7] Warcraft III, Call to Arms: https://liquipedia.net/warcraft/Call_to_Arms · https://warcraft.wiki.gg/wiki/Militia_(Warcraft_III)
- [E8] Age of Empires, Stadtglocke: https://ageofempires.fandom.com/wiki/Town_Bell
- [E9] McCloud, Vereinfachung: https://www.popmatters.com/110740-applying-understanding-comics-to-video-games-2496078642.html
- [E10] Dwarf Fortress: https://dwarffortresswiki.org/index.php/Memorial · https://dwarffortresswiki.org/index.php/Engraver
- [E11] Frostpunk: https://en.wikipedia.org/wiki/Frostpunk

**Zugänglichkeit und Oberfläche**
- [A1] Xbox Accessibility Guidelines 101/102: https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/101 · https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/102
- [A2] Game Accessibility Guidelines: https://gameaccessibilityguidelines.com/basic/ · https://gameaccessibilityguidelines.com/full-list/
- [A3] Celeste Assist Mode: https://celeste.ink/wiki/Assist_Mode · https://www.gamedeveloper.com/design/check-out-i-celeste-s-i-remarkably-granular-assist-options
- [A4] Lesbare Pixelschriften: https://cxong.github.io/2019/09/tips-for-legible-pixel-fonts
- [U1] (VW, nicht abgerufen) Nielsen, Antwortzeiten 0,1/1/10 s: https://www.nngroup.com/articles/response-times-3-important-limits/

**Leistung**
- [L1] Poki: https://developers.poki.com/guide/requirements-quality · https://sdk.poki.com/new-requirements.html · CrazyGames: https://docs.crazygames.com/resources/getting-to-the-first-frame/
- [L2] Frame Pacing: https://developer.android.com/games/sdk/frame-pacing
- [L3] three.js-Budgets: https://www.utsubo.com/blog/threejs-best-practices-100-tips · https://threejsroadmap.com/blog/draw-calls-the-silent-killer

**Eigener Code (nur gelesen):** `src/core/combat.js` (Trefferstopp 0,05/0,07/0,08 s),
`src/render/cameraRig.js` (`JITTER`), `src/core/settings.js` (keine Optionen für
Wackeln, Blitze, Farben), `src/ui/font.js` (Versalhöhe 7 px), `PROGRESS.md`
(Simulation 11 ms, 346–442 Zeichenaufrufe), `lib/three/three.module.js`
(`compileAsync`), `KONZEPT-GEMEINSCHAFT.md`.
