# „Letzte Runde“ – Recherche und Regelvorschlag

Stand 29.09.2026. **Methode:** Websuche; Seitenabrufe waren gesperrt, die
Belege stützen sich auf Suchauszüge (Nummern → Quellenliste). Dazu kommt ein
Varianten-Simulator (`recherche/karten-sim.mjs`, 10 000–20 000 Partien),
in dem die KI nur sieht, was ein Spieler sehen darf – im alten Simulator las
sie verdeckte Summen mit (`total(op)`). Die Zahlen zeigen Richtungen.

## Kurzfassung

- Die Idee trägt: drei Plätze, zwei davon gewinnen, 15 als Grenze, Klopfen.
  Das ist der Kern von Schotten Totten, Air, Land & Sea und Marvel Snap, aber
  in eigener Mischung.
- Es fehlten Legepflicht, eine Gleichstandsregel, ein Ausgleich für den
  Startspieler und ausgewogene Farbpaare. Der Vorschlag erreicht im Simulator
  **50,4 : 49,6 ohne Remis**, alle Farben liegen **bei 49–51 %**.
- Ein Bluff braucht vier Dinge: Kosten fürs Verdecken, einen Gegner, der nach
  seiner Vermutung entscheiden muss, Aufdecken und einen Einsatz.
- Die KI liest und schätzt, schaut aber nie in verdeckte Karten; ihre Ticks
  sind sichtbar und lassen sich nachprüfen.
- Belohnungen sind nur Kosmetik und **ohne Gemütlichkeitspunkte** – die geben
  im Code Erfahrung und Tempo (`furniture.js`, `COZY`).

## 1. Was die Vorbilder lehren

- **Pazaak (KotOR):** Ziel 20, Seitendeck, Stehen, eine Gleichstandskarte [1].
  Man zieht immer zuerst, und die Decks der Gegner werden später stärker –
  viele hielten die KI deshalb für eine Betrügerin [2]. → Die Sitzfolge
  ausgleichen und Fairness zeigen.
- **Caravan (Fallout: New Vegas):** drei Karawanen zwischen 21 und 26, dazu
  Richtung, Farbe und Bildkarten [3]. Die Dauerklage: unverständlich und
  schlecht erklärt [4]. → Wenige Regeln, im Spiel beibringen.
- **Gwent (Witcher 3):** zwei von drei Runden, Passen, Kartenvorteil – eine
  Runde zu opfern ist oft richtig [5]. Geliebt wegen „Nerven statt Glück“ [6]
  und der Kartenjagd bei Wirten [7]. Es ist freiwillig und anders als das
  Hauptspiel [9]. Kritik: eine schwache KI und übermächtige Spion-Decks [8].
  → Kein dauerhafter Kartenvorteil als Farbeffekt. Ein Gleichstandsvorteil
  als Eigenheit funktioniert (Nilfgaard [10]).
- **Triple Triad (FF8):** einfach, taktisch, fast jede Figur spielt mit [11].
  Kritik: Regeln wandern von Region zu Region, „Random“ und „Plus“
  frustrieren, Spieler laden neu [12]. Mit „Card Mod“ werden Karten zu
  Gegenständen, die das frühe Spiel trivial machen [13]. **Tetra Master
  (FF9)** frustrierte mit verborgenen Zahlenbereichen und Zufallsduellen [14].
  → Keine Kampfkraft als Belohnung, kein verborgenes Rechnen, nie etwas
  Unersetzliches verlieren.
- **Orlog (AC Valhalla):** Der Anfang wechselt jede Runde; Götterkräfte
  gewinnt man in der Welt [15]. **Red Dead:** RDR2 hat Poker, Blackjack,
  Domino und Messerspiel; **Liar's Dice gab es nur in RDR1** [16]. Auch dort
  hält sich der Verdacht, die KI schummle [17].
- **Inscryption:** Der Gegner sitzt am Tisch, spielt mit Requisiten und
  Masken [18]. **Balatro:** Jede Karte tritt vor, die Punkte zählen mit
  immer höheren Klängen hoch, und eine Vorschau fehlt bewusst, damit es
  spannend bleibt [19].
- **Card Shark:** Das Misstrauen ist als Leiste zu sehen [20]. **Poker Night
  at the Inventory:** feste Ticks je Figur (Max' linke Hand zittert beim
  Bluff), Getränke machen sie häufiger [21].
- **Schotten Totten und Battle Line:** Einen Stein beansprucht man nur mit
  Beweis aus den offenen Karten [22]. Bei Gleichstand gewinnt, wer zuerst
  fertig war. Die Legepflicht zwingt dazu, einen Platz zu opfern [23].
  **Schwimmen:** Wer klopft, gibt jedem noch genau einen Zug [24].
  **17 und 4:** überkauft ist tot [25].
- **Air, Land & Sea:** Eine verdeckte Karte darf überall liegen, zählt aber
  nur 2. Wer sich zurückzieht, begrenzt den Verlust, und der Anfang wechselt
  [26]. **Marvel Snap:** Gleichstand → Gesamtstärke → sonst Remis; „Snap“
  verdoppelt den Einsatz [27]. **Hanamikoji:** Eine geheime Karte zählt erst
  am Ende [28].
- **Love Letter:** jede Wirkung ein Satz; eine Karte bleibt aus dem Spiel,
  damit man nie sicher schließen kann [29]. **Lost Cities:** Festlegen kostet
  [30]. **Coloretto:** zu viele Farben schaden [31]. **Hanabi:** Information
  ist knapp [32]. **Liar's Dice:** Wer falsch liegt, zahlt [33].
- **Knucklebones und Queen's Blood:** drei Spalten bzw. Reihen, gelobt als
  ruhiger Gegenpol zum Hauptspiel [34, 35].

**Designwissen:**

- Bei drei oder mehr Feldern gibt es keine feste beste Verteilung (Colonel
  Blotto [36]) – Bluff ist hier Kern, nicht Zierrat.
- Ein Startvorteil wird mit Komi (ein halber Punkt verhindert Remis), mit der
  Kuchenregel oder mit einer Extrakarte ausgeglichen [37].
- Glück und Können sind zwei Achsen [38].
- Spieler erwarten bei 3 : 1 den Sieg [39], echte Serien wirken wie Betrug
  [40].
- Ein Bluff wirkt nur mit Einsatz, Aufdecken und der richtigen Häufigkeit
  [42, 46].

## 2. Probleme der Ausgangsidee (Frage 1)

1. **Kein eigenes Risiko:** Wer seine Karten kennt und frei legt, platzt nie;
   selbst mit Legepflicht platzen nur 0,2 Plätze je Partie. „Push your luck“
   braucht den Moment, in dem Weitermachen und Aufhören beide richtig wirken
   [46]. → Legepflicht, dazu wahlweise „blind legen“ (dann 0,4).
2. **Bluff ohne Anreiz:** Verdecken kostet nichts, und niemand entscheidet
   nach einer Vermutung. Im Simulator verliert jede bluffende KI gegen die
   vorsichtige (62–65 %), weil ihr Gegner nicht liest. → Verdeckt bildet
   keine Paare, Mond und Krähe spielen dagegen, Klopfen und Investieren sind
   Entscheidungen unter Unsicherheit, am Ende wird aufgedeckt.
3. **Gleichstand:** 15 ist der Mittelwert dreier Karten; mit fünf Handkarten
   gibt es 2,2–2,4 Volltreffer je Partie, und ein Viertel der Plätze endet
   summengleich (ohne Regel 23 % Remis). Ein Ziel von 16 oder 17 ändert daran
   nichts (getestet).
4. **Startspieler:** 52 : 45 plus 3 % Remis. Gleichstandsregeln verschieben
   den Vorteil: „Wer zuerst fertig war“ (Battle Line) ergibt 55 : 44,
   „Nachziehender gewinnt jeden Gleichstand“ 35 : 65.
5. **Dominante Farben:** Krähen-Tausch 55–58 %, Feuer ±1 52–54 %, Blatt
   +1 Karte 45–49 %, Mond-Spähen 43–47 %. Eine Farbe dominiert, wenn sie zwei Summen
   zugleich verschiebt, fast immer passt, dauerhaft wirkt (das Spion-Problem
   aus Gwent) oder kein Gegenspiel hat.
6. **Glück und Können:** Die Stile trennen sich mit 56–65 % – gesund, auch der
   Schwächere gewinnt. Aber Patzer zwischen guten Zügen kosten kaum: Eine KI
   mit 25 % Patzern, die nie blufft, schlug die ausgewogene 56 : 44. → Die
   Schwierigkeit kommt aus Denkweise und Lesen.
7. **Offene Stellen und Umfang:** Nachziehen, Aussetzen und Spielende fehlten.
   Mit vier Farbwirkungen, Bluff und Klopfen droht die Caravan-Falle.

## 3. Regelfassung (Frage 2)

**Stufe 1 – Grundspiel (Bert erklärt es am ersten Abend)**

1. 36 Karten: Blatt, Feuer, Mond und Krähe, je 1–9. **Jeder bekommt fünf
   Karten**, der Rest ist der Stapel.
2. Drei Plätze (Laterne, Kessel, Kürbis). Jeder legt nur auf seine Seite,
   **höchstens drei Karten je Platz**.
3. **Zug:** Pflicht ist genau eine Karte an einen eigenen Platz, offen oder
   verdeckt (je Platz höchstens eine eigene verdeckte). Dann nachziehen,
   solange der Stapel reicht. Wer nirgends legen kann, setzt aus.
4. **Volltreffer:** Genau 15 schließt den Platz für dich („Fünfzehn!“). Der
   andere sieht es nur, wenn alles offen liegt.
5. **Klopfen**, jeder einmal je Partie, statt zu legen, an einem Platz mit
   mindestens zwei eigenen Karten: Dein Platz ist zu. Der andere hat noch
   genau einen Zug (ohne Klopfen), dann wird dieser Platz aufgedeckt und
   entschieden – Schwimmen [24] trifft Schotten Totten [22], aber als
   Versprechen statt als Beweis.
6. **Entscheiden:** Sobald beide Seiten voll oder zu sind, wird aufgedeckt.
   Näher an 15 gewinnt, 15 oder weniger schlägt immer „geplatzt“. Sind beide
   geplatzt, gewinnt, wer weniger drüber liegt.
7. **Gleichstand:** zuerst weniger Karten, dann die höhere Einzelkarte, dann
   der, der die Partie nicht begonnen hat (Komi-Prinzip [37]).
8. Wer **zwei Plätze** hat, gewinnt sofort. Alle verdeckten Karten werden
   gezeigt.
9. **Abend:** bis zwei Siege, der Anfang wechselt. Beim Stand von 1 : 1 heißt
   die dritte Partie „Letzte Runde“.

**Stufe 2 – Farbpaare (Hilde, ab dem dritten Abend).** Die *zweite offene*
Karte einer Farbe am selben eigenen Platz löst einmal aus:

- **Feuer – Glut:** Steht der Platz bei der Wertung auf 14 oder 16, zählt er
  als 15.
- **Blatt – Laubwirbel:** Ziehe zwei Karten, wirf dann zwei Handkarten ab.
- **Mond – Mondlicht:** Decke eine verdeckte Karte des anderen auf; ein
  Gleichstand an diesem Platz gehört dir.
- **Krähe – Krähendieb:** Wirf eine offene Karte des anderen an diesem Platz
  ab (nicht nach einem Klopfen).

Die Farben halten sich in Schach: Offene Karten fürchten die Krähe, verdeckte
den Mond, und verdeckte bilden keine Paare. Jede Wirkung ist ein Satz, wirkt
einmal und ist sofort zu sehen – wie bei Love Letter [29].

**Stufe 3 – Griff ins Dunkle (Balduin):** Statt einer Handkarte darfst du die
oberste Stapelkarte ungesehen verdeckt an einen Platz legen. Sie gilt dort
als deine verdeckte Karte; du ziehst nicht nach, und ein Volltreffer ist
damit nicht möglich. Das ist das echte Wagnis aus Pazaak und 17 und 4.

**Simulator** (20 000 Partien, gleich starke KI):

| Fassung | Start : Nachziehend | Remis | geplatzt je Partie | Klopfen | Züge | Farben (Siegquote nach Auslösen) |
|---|---|---|---|---|---|---|
| Konzept E (5/6 Karten) | 48,3 : 47,7 | 4,0 % | 0,20 | 1,0 | 17,8 | 44–56 % |
| Stufe 1 | 50,4 : 49,6 | 0 % | 0,21 | 1,1 | 17,8 (entschieden nach 16,8) | – |
| Stufe 1 + 2 | 50,7 : 49,3 | 0 % | 0,23 | 1,1 | 18,0 | 49,3–52,6 % |
| Stufe 1–3 | 50,5 : 49,5 | 0 % | 0,40 (0,57-mal blind) | 1,2 | 18,1 | 49,0–50,9 % |

Rund 0,7 Plätze je Partie sind summengleich. Es entscheiden weniger Karten
(0,07 je Partie), die höhere Karte (0,4–0,55), der Mond (0,1) und nur
0,11–0,14-mal der Nachziehende. Etwa 17 Züge ergeben 2–3 Minuten je Partie,
ein Abend dauert **5–8 Minuten**.

**In einer Minute erklärt (Bert):** „Drei Plätze, fünf Karten. Du legst jede
Runde eine Karte auf deine Seite, höchstens drei pro Platz, eine davon darf
verdeckt liegen. Wer näher an 15 kommt, kriegt den Platz – drüber, und die
Kastanie ist geplatzt. Genau 15 ist ein Volltreffer. Einmal darfst du
klopfen: Dann hab ich noch einen Zug, und wir decken auf. Zwei Plätze
gewinnen.“ Gleichstände erklärt er erst, wenn einer passiert.

**Noch zu prüfen:** das Spielgefühl bei Menschen (gegen Bluffer ist der Mond
vermutlich stärker, als die Regel-KI zeigt), die vielen 15-zu-15-Plätze und
die Zeit je Zug.

## 4. KI-Stile und Tells (Frage 3)

**Stellschrauben:** Wagemut (wie nah an 15, wie viel Luft für Pflichtkarten),
Bluff (verdeckt, ohne es zu müssen), Blind, Klopfen (ab welcher Summe, wie
früh), Paare, Gedächtnis (0 = schätzt Verdecktes mit 5, 1 = kennt alles
Gesehene), Lesen (passt die Vermutung an Mikas aufgedeckte Bluffquote an) und
Tell (was, wann, wie zuverlässig, Gegen-Ticks). Die Stile folgen dem
Poker-Raster eng/locker × passiv/aggressiv [41]. Umgesetzt als Datensätze
[43] mit Launen, die die Bewertung verschieben (wie die Hex-KI [43]).

| Figur | Stil | Wagemut | Bluff | Klopfen | Gedächtnis/Lesen | Tell |
|---|---|---|---|---|---|---|
| Bert | gemütlich, Einstieg | mittel | nie | nie | 0 / 0 | reibt sich bei guter Hand die Hände (immer ehrlich) |
| Dr. Yusuf | vorsichtig („Ich bluffe nicht, ich schätze.“) | niedrig, bleibt bei 13–14 | 5 % | nur mit 15 | 0,5 / 0,3 | rückt die Brille, wenn er unsicher ist (85 %) |
| Juna | Chaos | hoch, oft blind | 60 % | früh, aus Spaß | 0 / 0 | kichert beim Verdecken – aber auch sonst (60 %) |
| Balduin | Draufgänger | hoch | 40 % | früh (ab 12) | 0,3 / 0,2 | tippt an die Mütze, wenn er blufft (80 %) |
| Hilde | Sammlerin | mittel | 20 % | mittel | 0,7 / 0,3 | summt, wenn sie ein Paar vorbereitet (80 %) |
| Der alte Fischer | still, der Stärkste | mittel | ~30 %, kaum auszunutzen | spät, genau | 1 / 1 | zieht an der Pfeife, wenn er stark ist – jedes dritte Mal täuscht er |

Im Simulator schlägt vorsichtig wild mit 64,5 %; die bluffenden Stile sind
also die leichteren Gegner. Der Fischer braucht deshalb Gedächtnis und Lesen,
zum Beispiel indem er die ungesehenen Karten mehrfach auslost und die Züge
durchspielt.

**Tells:** Ticks kommen nur bei echten Entscheidungen (verdecken, klopfen,
blind legen), mit fester Quote und seltenen Gegen-Ticks, über Ausdrucksplatte
und Geste. Beim Aufdecken lassen sie sich nachprüfen. Nach drei Beobachtungen
notiert Mika einen Verdacht („Balduin tippt an die Mütze … zweimal war es
geblufft“), eine Herbstbuch-Seite „Menschenkunde“ sammelt sie. Tee am Tisch
macht die Ticks häufiger, wie die Getränke in Poker Night [21]. Mikas Zögern
wird nie gelesen.

**Faire KI:** Sie bekommt nur eine Tischansicht (offene Karten, eigene Hand,
Gesehenes); Stapelfolge und verdeckte Werte stehen nicht darin.
- Prüfpunkt: Ändern sich Mikas verdeckte Werte, bleibt der Zug der KI gleich.
- Das Deck ist echt gemischt, aus einem Startwert, ohne Nachhelfen; die
  Schwierigkeit kommt nur aus dem Stil.
- Eine Nachschau zeigt alle verdeckten Karten, der Stapel hat einen Zähler,
  und einmal heißt es: „Niemand schaut in deine Karten.“ Das beugt dem
  KotOR- und RDR-Verdacht vor [2, 17, 40].

## 5. Belohnungen, Einsätze, Häufigkeit (Frage 4)

- **Nichts für die Verteidigung:** keine Rohstoffe, keine Erfahrung, keine
  Turmteile, keine Baupläne (die Card-Mod-Lehre [13]). Möbel mit `cozy`
  geben Morgen-Erfahrung und „ausgeschlafen“; Gewinne vom Kartentisch haben
  deshalb Gemütlichkeit 0 oder sind Varianten.
- **Einsätze:** Die Figur legt ihr Stück sichtbar auf den Tisch (Balduins
  Taschenuhr, Yusufs Teedose, Junas Funkabzeichen, das Flaschenschiff des
  Fischers). Mika setzt eine Pflicht („Wer verliert, spült ab“), die am
  Morgen als Szene zu sehen ist – nie Rohstoffe [12].
- **Belohnungen:** Der erste Sieg gegen jede Figur bringt ihr Stück. Danach
  gibt es Kartenrückseiten, Schallplatten (neue Stücke fürs Grammophon),
  Tassen, Mützen und Taten im Herbstbuch; neue Einsätze alle paar Tage,
  insgesamt etwa 20 Dinge über den Herbst.
- **Wie oft:** höchstens ein Abend-Match je Tag, freiwillig [9]. Die Uhr
  steht, danach wird eine feste Zeit abgebucht; bei Regen spielt man am
  Kamin.
- **Besondere Abende:** nach der Bossnacht ein kleines Turnier beim Fest; am
  Abend vor der Frostnacht spielen alle die „Letzte Runde“. Balduin spielt
  vielleicht vor dem Ablegen eine Runde am Steg.

## 6. Präsentation (Frage 5)

- **Bühne:** Die Kamera blickt nach Norden. Also sitzt der Gegner nördlich
  des Tisches mit dem Gesicht zu uns, Mika südlich mit dem Rücken zur Kamera,
  nah mit 160 px/m. Licht kommt nur über Lichtinseln (Regel 7). Wie bei
  Inscryption ist der Gegner eine Figur und der Tisch Bühne [18]; dazu
  klickbares Spielzeug wie im Hearthstone-Brett: Kastanien, Knopf, die Krähe
  [44].
- **Karten:** groß auf der Oberflächen-Leinwand (etwa 26 × 36 px), große
  Ziffern, Farbe als Pixel-Symbol plus Form (auch bei Farbenblindheit
  lesbar). Summen darunter: die eigene genau, die des anderen als „8 + ?“.
  Oben das Porträt mit Ausdrücken. „Unser Spiel ist Oberfläche“ [44].
- **Bewegung im Maß der Handlung** [45]: Karten im Bogen austeilen und in drei
  Bildern umdrehen. Beim Klopfen pocht die Faust zweimal aufs Holz, das Bild
  wackelt um 1 px. Beim Aufdecken wendet sich Karte für Karte, die Summe
  zählt mit steigender Tonhöhe [19]. Ein Volltreffer ist ein Flammenstoß,
  beim Platzen platzt eine Kastanie. Farbpaare: Funken, Laubwirbel,
  Mondschimmer, und eine Voxel-Krähe schnappt sich die Karte.
- **Klang und Musik:** synthetisch – Mischen, Wischen, Holzschläge,
  Kastanienknall, dazu die vorhandenen Klänge für Krähe, Feuer und Regen und
  ein Glockenton für den Mond. Ein ruhiges Stück „Kartenabend“ im
  Dreiertakt, mit einer Spannungsschicht beim Klopfen und in der Letzten
  Runde. Vor dem Aufdecken ein Schlag Stille. Sieg-Motive je Figur (Balduins
  Fanfare gibt es schon).
- **Reaktionen:** kurze Sprüche je Ereignis, Erinnerung an frühere Partien
  („Revanche!“) – Kartenspiel ist vor allem Tischgespräch [47].
- **Einstieg und Tempo:** drei Regelstufen, die erste Partie gegen Bert
  vorbereitet, das Regelblatt im Notizbuch; die KI denkt 0,5–1,5 s mit
  Geste, dazu ein schneller Modus.

## Quellen

1. Pazaak, Regeln und Gleichstandskarte: https://starwars.fandom.com/wiki/Pazaak/Legends
2. Pazaak, Verdacht „KI schummelt“: https://steamcommunity.com/app/32370/discussions/0/451851477879703087/
3. Caravan, Regeln: https://fallout.fandom.com/wiki/How_to_play_Caravan · https://www.pagat.com/invented/caravan.html
4. Caravan, Kritik: https://steamcommunity.com/app/22380/discussions/0/3829787744077378146/ · https://steamcommunity.com/app/22380/discussions/0/630799997812894449/
5. Gwent, Kartenvorteil und Passen: https://www.redbull.com/gb-en/Witcher-3-gwent-guide-2018 · https://witcherremastered.wiki/guides/gwent/
6. Gwent, „Nerven statt Glück“: https://www.gamesradar.com/why-i-love-the-witcher-3-gwent/
7. Gwent, Karten von Wirten: https://witcher.fandom.com/wiki/Collect_%27Em_All · https://www.thegamer.com/the-witcher-3s-gwent-is-fun-because-of-the-adventure/
8. Gwent, KI und Spion-Decks: https://www.nexusmods.com/witcher3/mods/3322 · https://forums.cdprojektred.com/index.php?threads/seriously-getting-sick-of-the-ai-in-gwent.50946/
9. Gwent als Minispiel: https://gamedevsjourney.substack.com/p/what-we-can-learn-from-the-perfect
10. Nilfgaard gewinnt Gleichstände: https://witcher.fandom.com/wiki/Nilfgaardian_Empire_Gwent_deck
11. Triple Triad, warum geliebt: https://www.pcgamer.com/why-i-love-triple-triad-in-final-fantasy-viii/
12. Triple Triad, wandernde Regeln und Kritik: https://finalfantasy.fandom.com/wiki/Triple_Triad_(Final_Fantasy_VIII) · https://home.eyesonff.com/showthread.php/114857-I-hate-Triple-Triad-with-the-power-of-a-thousand-suns
13. Card Mod: https://jegged.com/Games/Final-Fantasy-VIII/Tips-and-Tricks/Triple-Triad-Power-Up-Strategy.html · https://finalfantasy.fandom.com/wiki/Card_Mod
14. Tetra Master: https://xvw.lol/en/articles/tetra-master.html · https://gamefaqs.gamespot.com/boards/197338-final-fantasy-ix/55236353
15. Orlog: https://twinfinite.net/guides/assassins-creed-valhalla-orlog-explained/
16. Minispiele in RDR2 und RDR1: https://www.rdr2.org/guides/mini-games-guide/ · https://gamerant.com/red-dead-redemption-relaxing-minigames-poker-blackjack-dominoes-fishing/
17. RDR2, Poker-Verdacht: https://gamefaqs.gamespot.com/boards/200179-red-dead-redemption-2/77171159
18. Inscryption: https://www.thegamecrater.com/inscryption-a-horror-paragon-of-our-time-pc-review/ · https://www.gamedeveloper.com/design/how-game-jam-sacrifices-became-inscryption
19. Balatro: https://blakecrosley.com/guides/design/balatro · https://toucharcade.com/2024/03/18/balatro-interview-mobile-port-localthunk-dlc-plans-updates-new-jokers-demo-feedback/ · https://rogueliker.com/balatro-interview/
20. Card Shark: https://www.gamespot.com/articles/card-shark-tips-for-beginners/1100-6504041/
21. Poker Night, Ticks: https://theinventory.fandom.com/wiki/Tells · https://games.gg/poker-night-at-the-inventory/guides/poker-night-at-the-inventory-list-of-all-tells/
22. Schotten Totten: https://www.ultraboardgames.com/schotten-totten/game-rules.php · https://boardgamegeek.com/wiki/page/Schotten-Totten_FAQ
23. Battle Line: https://gamerules.com/rules/battle-line/ · https://thethoughtfulgamer.com/2021/05/27/battle-line-review/ · https://islaythedragon.com/game-reviews/thats-quite-the-line-up-a-review-of-battle-line/
24. Schwimmen/31: https://www.spielregeln.de/schwimmen.html
25. Siebzehn und Vier: https://de.wikipedia.org/wiki/Siebzehn_und_Vier
26. Air, Land & Sea: https://ultraboardgames.com/air-land-and-sea/game-rules.php · https://www.meeplemountain.com/reviews/air-land-sea/
27. Marvel Snap: https://marvelsnap.helpshift.com/hc/en/3-marvel-snap/faq/90-how-do-i-win-a-match/ · https://marvelsnapzone.com/snapping/
28. Hanamikoji: https://en.doc.boardgamearena.com/Gamehelphanamikoji
29. Love Letter: https://cardanoir.com/love-letter-rules/ · https://en.wikipedia.org/wiki/Love_Letter_(card_game)
30. Lost Cities: https://en.wikipedia.org/wiki/Lost_Cities
31. Coloretto: https://en.wikipedia.org/wiki/Coloretto
32. Hanabi: https://en.wikipedia.org/wiki/Hanabi_(card_game)
33. Liar's Dice: https://en.wikipedia.org/wiki/Liar%27s_dice
34. Knucklebones: https://www.thegamer.com/cult-of-the-lambs-knucklebones-dice-game-gwent-machine-strike/ · https://cult-of-the-lamb.fandom.com/wiki/Knucklebones
35. Queen's Blood: https://en.wikipedia.org/wiki/Queen%27s_Blood
36. Colonel Blotto: https://en.wikipedia.org/wiki/Blotto_game
37. Komi, Kuchenregel, The Coin: https://en.wikipedia.org/wiki/Komi_(Go) · https://en.wikipedia.org/wiki/Pie_rule · https://hearthstone.wiki.gg/wiki/The_Coin
38. Glück und Können (Garfield): https://boardgamedesignlab.com/luck-vs-skill-with-richard-garfield/ · https://www.gamedeveloper.com/design/luck-vs-skill-the-false-dichotomy
39. Sid Meier, Wahrnehmung von Chancen: https://www.shacknews.com/article/62807/sid-meier-and-rob-pardo
40. Zufall, Serien und Verdacht: https://nerdbot.com/2026/09/22/every-game-you-play-is-lying-about-its-randomness-and-that-is-usually-the-right-call/ · https://arxiv.org/pdf/2511.04487
41. Poker-Spielertypen: https://www.pokerology.com/poker/strategy/playing-styles/
42. Bluffquote: https://en.wikipedia.org/wiki/Bluff_(poker) · https://upswingpoker.com/what-is-bluff-to-value-ratio/
43. KI-Persönlichkeiten: https://www.gamedeveloper.com/design/personality-parameters-flexibly-and-extensibly-providing-a-variety-of-ai-opponents-behaviors · https://www.vice.com/en/article/hex-tcg-ai/
44. Hearthstone, Oberfläche und Brett: https://www.gamedeveloper.com/design/video-designing-an-immersive-user-interface-for-i-hearthstone-i- · https://medium.com/@matt.tsui/hearthstone-design-thinking-inside-the-box-78dbacb96040
45. „Juice it or lose it“: https://www.richtaur.com/GameDevTreasure/post/juice-it-or-lose-it/
46. Push your luck und Bluff: https://boardgamegeek.com/blog/5824/blogpost/119628/pushing-your-luck-the-most-important-mechanism-in · https://boardgamegeek.com/blog/3665/blogpost/31889/to-bluff-or-not-to-bluff-that-is-the-decision
47. Kartenspiel als Tischgespräch: https://www.gamesradar.com/card-games-gwent-the-witcher-3/
