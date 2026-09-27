# Theo – m7-r1

*Optimierer-Sicht: Kosten, Erträge, Zeiten, Balance. Wird laufend während der Sitzung ergänzt.*

## Was Spaß gemacht hat
- Der Sprung von Tag zu Nacht 1: Aus 1 Bolzenwerfer + Fäustlinge wurde ein
  handfester Kampf mit echtem taktischem Rückzug (Gesundheit im Blick
  behalten, HP regeneriert von selbst zwischen Treffern).
- Die Turm-Platzierungsvorschau ist hervorragend für einen Optimierer:
  Reichweitenkreis, gepunkteter Hordenweg UND ein Kreuz genau dort, wo die
  Horde die Wand angreift (Screenshot: theo/04-turmvorschau-taktik.png).
  Damit lässt sich Verteidigung wirklich planen, statt zu raten.
- Fäustlinge (3 Stoff/4 Fasern/2 Schrott) sind ein überraschend gutes
  Frühwaffe-Schnäppchen: 7 Schaden, 3,6 Schläge/s, jeder 3. Schlag doppelt –
  einzelne Schlurfer fallen in 2–3 Sekunden, für nur 2 Schrott Materialeinsatz.
- Level-Up und Perk-Wahl pausieren automatisch, bis „es ruhig ist“ – kein
  Streit zwischen Mikromanagement und Kampf.

## Wo ich hängen blieb oder mich gelangweilt habe
- Sehr viel Anfangszeit ging für Navigation drauf: Wo ist die Werkbank
  (sieht der Steinkiste, die einen Spitzhacke verlangt, zum Verwechseln
  ähnlich), wo ist ein Baum ohne Reifenschaukel daneben (die Schaukel
  „gewinnt“ den Interaktionsfokus, auch wenn ein Baum dahinter direkt
  Holz gäbe – 3–4 Fehlversuche).
- Pickel-Henne-Ei: Die Spitzhacke selbst kostet 2 Stein – aber ohne
  Spitzhacke gibt es keinen Stein außer seltenen losen Kieseln. Das erste
  Rezept ist so für einen zügigen Spieler ein kleiner Umweg, keine Blockade
  (lose Kiesel/Steine liegen genug herum), aber merkwürdig gestaltet.
- Nacht 1, Welle 3: Zwei Schlurfer blieben ca. 2 Spielstunden lang
  reglos neben meiner Werkbank stehen – griffen weder mich noch das
  Zuhause an, ließen sich auch nicht treffen (siehe Fehler F1). Erst der
  Morgengrauen hat sie automatisch vertrieben. Reiner Leerlauf.
- Klick-Zielerfassung im Nahkampf ist unzuverlässig: Klicks direkt auf
  einen sichtbar benachbarten Schlurfer trafen öfter ins Leere als sie
  trafen, ohne dass optisch ein Grund erkennbar war (siehe F2).

## Was unklar war
- Warum die „Nordwand“ von der Seite angegriffen wird, an der ich stehe,
  obwohl ich per Kamera nie die Rückseite des Hauses sehen kann – ich
  konnte oft nicht herausfinden, ob ich gerade an der richtigen Wand
  kämpfe oder gegen eine unsichtbare Kulisse anrenne.
- Die Perk-Auswahl per Taste S+Enter hat zweimal nicht die Option gewählt,
  die ich ansteuern wollte (siehe F3) – blieb unklar, ob das an mir oder
  am Spiel lag.

## Fehler

### F1: Schlurfer bleiben stundenlang regungslos an der Werkbank stehen (Schwere: Spielfluss)
- Schritte: Nacht 1, Welle 3/3 (Richtung Nordosten). Zwei Schlurfer
  erreichen den Bereich um die selbstgebaute Werkbank, bleiben dort stehen.
- Erwartet: Sie greifen entweder mich, das Zuhause an oder sind für mich
  treffbar.
- Passiert: Keins von beidem, über mindestens 2 Spielstunden (00:16–04:36
  im Log) hinweg keine Änderung an Zuhause-HP, meiner HP oder ihrer Zahl.
  Erst der automatische Rückzug bei Tagesanbruch (05:31) beendet die Welle.
- Screenshot: theo/03-nacht1-stuck-zombies.png
- Vermutung: Pfadfindung verheddert sich an der selbstgebauten Werkbank
  (das gleiche Möbel hatte zuvor schon mehrfach „Kein Platz“-Kollisionen
  mit Vorschau-Objekten in der Nähe ausgelöst).

### F2: Nahkampf-Klicks auf sichtbar benachbarte Schlurfer treffen oft nicht (Schwere: Spielfluss)
- Schritte: Fäustlinge ausgerüstet, auf einen 1–2 Kacheln entfernten,
  sichtbaren Schlurfer klicken.
- Erwartet: Der Schlag trifft (die Reichweite 1,25 m sollte das erlauben).
- Passiert: Wiederholt mehrere Klicks in Folge ohne jede Wirkung (keine
  Schadenszahl, kein Vorratswechsel), obwohl der nächste Klick an
  praktisch gleicher Bildposition sofort traf. Kostet unnötig viele
  Aktionen im laufenden Kampf.
- Screenshot: theo/02-nacht1-kampf-nahaufnahme.png

### F3: Perk-Auswahl per Taste wählte zweimal nicht die angesteuerte Option (Schwere: Feinschliff)
- Schritte: Perk-Wahl-Bildschirm (3 Optionen), zweimal `S` gedrückt
  (Cursor sollte von Option 1 auf Option 3 wandern), dann `Enter`.
- Erwartet: Option 3 gewählt.
- Passiert: Beide Male wurde Option 1 übernommen („Rückendeckung“ statt
  „Dickes Fell“, später „Glückspilz“ statt „Dickes Fell“). Keine visuelle
  Bestätigung im Bildschirmtext, welche Option gerade markiert ist, macht
  das schwer zu debuggen. Mit einzelnen `W`-Drücken (statt zwei schnellen
  `S`) klappte eine Menüauswahl später auf Anhieb – der Verdacht liegt
  nahe, dass zwei rasch aufeinanderfolgende Tastendrücke ohne genug
  Zeit dazwischen teilweise verschluckt werden.

### F4: Ohne Eingreifen der Figur kippt die Wirtschaft ab Nacht 2 in eine Abwärtsspirale ohne Ausweg (Schwere: Blocker)
- Schritte: Nach Nacht 1 (aktiv gespielt, siehe oben) zwei Türme besessen,
  danach Nächte 2–7 nur noch mit `wait` durchlaufen lassen (kein Kampf,
  keine Bergung von Loot), um im vorgegebenen Zeitrahmen bis Tag 8 zu
  kommen.
- Erwartet: Zwei Türme (Bolzenwerfer + Kürbiskatapult) sollten zumindest
  einen Teil der Horde selbstständig abwehren und etwas Loot liegen bleiben,
  das ich am nächsten Morgen hätte einsammeln können.
- Passiert: Nacht 2 verliert das Zuhause bereits (7 besiegte Schlurfer,
  „Eingesammelt: nichts“, weil niemand da war zum Aufsammeln). Ab Nacht 4
  fällt die Zahl besiegter Schlurfer auf **0** und bleibt es bis Nacht 7 –
  die Türme scheinen nach genug Rüffeleien nicht mehr zu schießen
  („Die Türme sind angeschlagen“ nach jeder Niederlage, ohne dass ich sie je
  reparieren konnte, weil dafür wieder Loot nötig wäre, das nur beim Kampf
  vor Ort anfällt). Das Zuhause wird jede Nacht exakt auf 75/300 „geflickt“,
  der Vorrat bleibt bei 5 Schrott/3 Zahnrädern eingefroren, die
  Reparaturkosten steigen aber weiter (Nacht 1: 10 Holz/7 Schrott, Tag 8:
  31 Holz/23 Schrott) – ein Kreislauf, aus dem ohne Spielereingriff kein
  Ausweg sichtbar ist.
- Einordnung: Kein Absturz, kein korrupter Spielstand (das Kernversprechen
  „Verlieren kostet nie den Spielstand“ hält), aber ein wirtschaftlicher
  Softlock: Wer 2–3 schlechte Nächte hintereinander hat und dann nicht
  mehr mit voller Kraft gegensteuert, kommt aus eigener Kraft nicht mehr
  heraus. Für einen Optimierer eine klare Warnung: Türme *müssen* nach
  jeder angeschlagenen Nacht sofort repariert werden, sonst verstärkt sich
  der Schaden exponentiell.
- Screenshot: theo/05-horde-bricht-durch.png (Durchbruch, Nacht 3),
  theo/06-tag8-abwaertsspirale.png (Zustand Tag 8, Zuhause dauerhaft rot)

## Messwerte

### Titelbild und Einstieg
- Titelbild: stimmungsvolles Diorama (Haus, Lagerfeuer, Hühner, Wäscheleine),
  klarer Text „Ein gemütliches Zuhause am Ende der Welt“, drei Knöpfe
  (Neues Spiel/Einstellungen/Steuerung), W/S + E/Enter direkt nutzbar
  (Screenshot: theo/01-titelbild.png).
- Figurenerstellung: Name, Mütze/Jacke/Haar/Haut-Farbe, Vorschau lebendig in
  der Spielwelt dahinter. Vorbelegt mit Mikas Design (orange/grün) – „Los
  geht's“ ist vorgewählt, ein einziger Enter-Druck reicht zum Start.
- Intro-Dialog kurz und überspringbar (Enter-Spam funktioniert). Erstes Ziel
  „Nimm die Axt vom Hackklotz“ mit goldenem Pfeil im Bild – Wegfindung zum
  Klotz war für mich selbstverständlich.
- Vom Titelbild bis zur ersten Nacht vergehen ca. 45 Spielminuten (Axt holen,
  ersten Turm bauen); das ist zügig, aber ich (Effizienzspieler) habe für die
  Nebenziele wie Rohstoffsuche für die Werkbank spürbar Zeit verloren, weil
  Wegweiser für Schrott-Quellen fehlen (siehe „Wo ich hängen blieb“).

### Nächte im Überblick

**Methodik-Hinweis:** Nacht 1 habe ich vollständig aktiv gespielt (bewegen,
zuschlagen, Beute holen). Das kostete so viele Brücken-Befehle, dass für
Nächte 2–7 im vorgegebenen Rahmen nur noch Zeitraffer (`wait`) ohne
Eingreifen blieb, um überhaupt bis Tag 8 zu kommen. Die Zahlen für Nacht 1
sind belastbar, die für Nacht 2–7 zeigen den „Autopilot“-Fall (siehe F4)
und damit eine reale, aber einseitige Spielweise.

| Nacht | Wellen | Schlurfer gesamt (ca.) | Zuhause vorher/nachher | Loot (Schrott/Zahnräder/Kerne) | Türme (Typ/Stufe) | Mika-Stufe/Perks |
|---|---|---|---|---|---|---|
| 1 | 3/3, aus NW/W/NO | ~18 (2 blieben bis zum Morgengrauen stehen, siehe F1) | 300 → 208, repariert auf 282 (80 %, Vorrat reichte nicht für 100 %) | Ende der Nacht: 23 Schrott, 2 Zahnräder | 1× Bolzenwerfer (Stufe 1, vor der Nacht gebaut); 1× Kürbiskatapult direkt danach aus dem Nacht-Loot finanziert | Stufe 1 → 3; Perks: Rückendeckung 1, Glückspilz 1 (beide nicht die zuerst anvisierte Wahl, siehe F3) |
| 2 | nicht beobachtet (im Zeitraffer übersprungen) | 7 besiegt (durch Türme, ohne mein Zutun) | 282 → 75 (**verloren**, „Streuner“ nagten schon abends 57 ab) | „Eingesammelt: nichts“ – niemand da zum Bergen | 2 (unverändert, aber laut Bericht „angeschlagen“) | 3, unverändert |
| 3 | 1/4, aus NW **und** Osten gleichzeitig (erste Zwei-Wege-Nacht) | 3 besiegt, dann Durchbruch | 142 → 75 (**verloren**, Ohnmacht-Sequenz „Die Horde bricht durch …“) | keins | 2, weiter angeschlagen | 3, unverändert |
| 4 | nicht beobachtet | 0 besiegt | 75 → 75 (**verloren**) | keins | 2, angeschlagen | 3, unverändert |
| 5 | nicht beobachtet | 0 besiegt | 75 → 75 (**verloren**) | keins | 2, angeschlagen | 3, unverändert |
| 6 | nicht beobachtet | 0 besiegt | 75 → 75 (**verloren**) | keins | 2, angeschlagen | 3, unverändert |
| 7 | nicht beobachtet | 0 besiegt | 75 → 75 (**verloren**) | keins | 2, angeschlagen | 3, unverändert |

Auffällig: Ab Nacht 3 kommt die Horde schon aus **zwei** Richtungen
gleichzeitig – mit nur zwei fest verbauten, nicht nachgerüsteten Türmen
(siehe F4) ist das ohne Spielerin/Spieler vor Ort nicht zu halten. Die
Schwierigkeitskurve wirkt in Nacht 1→3 spürbar und fair ansteigend
(3 Wellen → 4 Wellen, eine weitere Angriffsrichtung); ob sie ab Nacht 4
weiter gleichmäßig steigt, kann ich mangels aktiv gespielter Daten nicht
beurteilen.

### Wirtschaft
- Schrott-Quellen am Tag: Schrotthaufen (~2 Schrott + Beifang, einmal pro Tag
  leerbar), Autowrack (4 Schrott + 2 Stoff + 1 Zahnrad beim ersten Fund),
  Holzkiste (weitere 4 Schrott + 2 Stoff) – alle „heute leer, morgen wieder“.
  Für ein planbares Nacht-1-Budget mussten alle drei gefunden werden.
- Tagesmaterial-Kreislauf: Holz/Stein/Fasern fallen beim Sammeln praktisch
  nebenbei ab (Äste, Gras, lose Kiesel); Verwerten an der Werkbank tauscht
  2 Stein → 1 Schrott bzw. 3 Holz → 1 Schrott – schlechter Kurs, nur als
  Notnagel sinnvoll, wenn Materialart im Überfluss und Schrott knapp ist.
  Fasern → Stoff (4:1?) lohnt sich, wenn Stoff gebraucht wird.
  Wichtigste Schrottquelle bleibt klar die Horde selbst: ein einzelner
  Kampf-Schlurfer brachte 1–2 Schrott, macht bei ~14 Kills in Nacht 1 den
  Löwenanteil meines Vorrats aus.
- Figur-Aufwertungen (Sammelradius/Lebenskraft/Schlagkraft/Tempo) kosten
  Stufe 1 einheitlich 6–8 Schrott, danach steigend (Sammelradius 2 schon 12).
  Ein zweiter Turm derselben Art kostet ebenfalls +2 Schrott je Exemplar –
  identische Progressions-Formel für Figur und Türme, wirkt bewusst
  aufeinander abgestimmt.
- Reparatur ist proportional zum Vorrat abrechenbar (nicht Alles-oder-
  nichts): 10 Holz/7 Schrott gefordert, 8 Holz vorhanden → 80 % Reparatur
  für 8 Holz + 6 Schrott. Fair und verständlich in Zahlen ausgedrückt.
- Kehrseite dieser Kulanz: Die Reparaturkosten wachsen mit jedem weiteren
  Schaden (10 Holz/7 Schrott → 18/13 → 25/18 → 31/23 über vier
  Nächte hinweg), während der eigene Vorrat ohne Kampfteilnahme still
  steht. Ohne neuen Loot-Zufluss (der nur durch Kämpfen oder Sammeln vor
  Ort entsteht) läuft die Reparatur-Rechnung von der Wirtschaft ab –
  siehe F4.
- Knopf gräbt laut Morgenbericht „etwas aus“, aber in 6 von 7 beobachteten
  Morgen stand dahinter kein Wert (leeres Feld) – als passives Sicherheits-
  netz gegen eine Abwärtsspirale taugt das nicht.

### Überlebende, Aufträge, Möbel, Funkturm
- Tag 2, 06:00 (auf die Minute mit dem Tageswechsel): Knopf, der Hund, taucht
  am Briefkasten auf, mit eigenem Gedankentext und einem kleinen
  Dialog („Wuff!“ → „Komm her, Knopf!“ vs. „Bis später.“). Die Einladung
  schaltet sofort den vierten Bauleisten-Reiter „Einrichten“ frei
  (Schlafzelt, Bild, danach Körbchen für Knopf) – spürbar und unmittelbar
  belohnend, genau die Art von „sichtbarem Fortschritt“, die DESIGN.md
  verspricht.
- Konkreter Nutzen laut Spieltext: Knopf bellt vor der Horde (Vorwarnung)
  und gräbt morgens Fundstücke aus. In der Praxis kam bei mir über 7 Morgen
  nur einmal wirklich ein Zahnrad dabei heraus (Nacht 2 → Tag 3), sechsmal
  blieb das Feld leer. Als Vorwarnung konnte ich sie nicht bewerten, weil
  ich in den entscheidenden Nächten nicht vor Ort war.
- Aufträge, Tauschhandel, weitere Überlebende, Möbel-Gemütlichkeit und der
  Funkturm wurden in dieser Runde nicht erreicht (Zeitrahmen). Aus reiner
  Kostenperspektive: Ein Hund für nichts weiter als einen kurzen Dialog und
  eine (meist leere) Morgengabe ist ein netter, aber wirtschaftlich noch
  unbewiesener Deal – da müsste über mehr Tage mehr zurückkommen, damit
  sich „Überlebende aufnehmen“ als Strategie und nicht nur als Deko lohnt.

### Exploits / dominante Strategien
- Fäustlinge + Rückendeckung/Nähe zum Turm ist ökonomisch die stärkste
  frühe Kombination: 2 Schrott Materialkosten gegen 6–12 Schrott für die
  günstigste Turm-Stufe, und die Figur ist die einzige Einheit, die sich
  aktiv zwischen zwei Angriffspunkten bewegen kann. Ein Turm deckt nur
  seinen Kreis, ich decke den Rest.
- Schrotthaufen/Autowrack/Kiste zuerst leerräumen, bevor überhaupt gebaut
  wird, ist die klar dominante Eröffnung – ohne diese ~10 Schrott reicht es
  nicht einmal für den ersten Turm.
- Kein Exploit im positiven Sinn gefunden, aber eine „Anti-Strategie“, die
  ich nur durch die Zeitnot dieser Runde entdeckt habe und die jeder echte
  Spieler unbedingt vermeiden sollte: Eine Nacht auslassen oder verlieren
  und danach nicht sofort mit vollem Einsatz gegensteuern (Türme reparieren,
  neue Türme bauen), reicht aus, um in die unter F4 beschriebene Spirale zu
  rutschen. Umgekehrt heißt das: Wer aktiv bleibt, wird durch Reparatur-
  Rabatt und Sammelradius-Ausbau spürbar belohnt – „Aufrüsten“ lohnt sich
  in Nacht 1 eindeutig, ich konnte es für spätere Nächte nur nicht mehr
  belegen.

## Checkliste
- Tag ruhig genug zum Bauen? – Ja. In über 7 Spieltagen griff mich tagsüber
  nie ein Schlurfer gezielt an; die ein-, zweimal täglichen Trupps nagten
  nur am Zuhause, nie an mir, genau wie in DESIGN.md beschrieben.
- Nächte mit Action? – Nacht 1 ja, sehr sogar (echtes Gedränge, siehe
  Screenshot 02). Für Nächte 2–7 kann ich das nicht mehr aus eigenem
  Erleben bestätigen (siehe Methodik-Hinweis).
- Aufrüsten lohnend? – In Nacht 1 eindeutig ja: Fäustlinge und der zweite
  Turm haben sich noch in derselben Nacht ausgezahlt. Ohne Nachrüsten nach
  Rückschlägen kippt die Rechnung aber ins Negative (F4).
- Schwierigkeit gleichmäßig und fair? – Nacht 1→3 ja (klar spürbare, faire
  Steigerung: mehr Wellen, zweite Angriffsrichtung ab Nacht 3). Ob es
  danach fair bleibt, kann ich nicht beurteilen – ich habe nicht aktiv
  genug dagengehalten, um das zu testen.
- Look passt zu DESIGN.md? – Ja, sehr: warme Lichtinseln in kühler,
  blauer Nacht, rasterte lavendelfarbene Umrisse für verdeckte Schlurfer,
  Trefferzahlen in Pixelschrift, Bildwackeln bei Treffern – alles wie
  beschrieben vorhanden (siehe Screenshots 02, 04, 05).
- Erkennt man, was was ist (Figur, Quellen, Bauten, Schlurfer, Türme,
  Loot)? – Ja, durchweg gut lesbar; einzige Verwechslungsgefahr:
  Werkbank und ein loser Steinbrocken sehen sich aus der Ferne ähnlich
  (siehe „Wo ich hängen blieb“).
- Wie ist der Einstieg vom Titelbild bis zur ersten Nacht? – Reibungslos
  und angenehm kurz (Titelbild → Figur wählen → Intro → erstes Ziel →
  erster Turm in geschätzt 45 Spielminuten), mit klaren Zielpfeilen. Der
  einzige Reibungspunkt war das Auffinden der Werkbank/Rohstoffquellen,
  nicht die Menüführung selbst.
- Trägt das Spiel über mehrere Tage? – Die Grundschleife (Tag sammeln,
  Nacht verteidigen, Morgen reparieren) trägt strukturell klar über
  mehrere Tage, und der Fortschritt (Figur-Stufe, zweiter Turm, Knopf) ist
  jeden Morgen sichtbar. Was mir fehlte, um das über 8 Tage durchzuhalten,
  war eher meine eigene Zeit als das Spiel: Ich hätte jede Nacht aktiv
  mitkämpfen müssen, um aus der Spirale herauszubleiben – das Spiel selbst
  hat mich nicht gelangweilt, es hat nur keine Atempause für passives
  Zusehen gelassen.
- Sind die Überlebenden sympathisch und nützlich? – Sympathisch: ja, sehr
  (Knopfs Ankunft war der wärmste Moment der Runde). Nützlich konnte ich in
  der kurzen Zeit nicht wirklich nachweisen (siehe oben).
- Würdest du weiterspielen? – Ja, mit einem Vorbehalt: Ich würde ab sofort
  jede Nacht wieder aktiv mitkämpfen und nach jedem Rückschlag zuerst
  reparieren, bevor ich weitersammle. Die Kernschleife motiviert mich als
  Optimierer („noch einen Turm, noch ein Level“) – ich will nur nicht
  wieder in die unter F4 beschriebene Spirale geraten.

## Gesamturteil (1–10) und wichtigster Wunsch

**7/10.** Nacht 1 war genau das gemütlich-spannende Tower-Defense-Erlebnis,
das DESIGN.md verspricht: klare Wirtschaft, lohnendes Aufrüsten, ein
Perk-System, das nicht stört, und ein Look, der zu jeder Tageszeit trägt.
Der Punktabzug kommt nicht von einem einzelnen groben Fehler, sondern von
zwei Dingen, die sich gegenseitig verstärken: unzuverlässige Nahkampf-
Zielerfassung (F2) kostet in jedem einzelnen Kampf unnötige Aktionen, und
das Fehlen jeder Bremse gegen eine Abwärtsspirale (F4) macht jeden
Rückschlag potenziell permanent. Mein wichtigster Wunsch: irgendeine Form
von Auffang-Mechanik für eine schlecht gelaufene Nacht oder Serie von
Nächten – und sei es nur ein kleiner garantierter Mindest-Loot-Fund am
Morgen, unabhängig davon, ob am Vorabend gekämpft wurde – damit ein
schlechter Lauf nicht endgültig ist, während die Kernschleife für den
Rest genau richtig bleibt.
