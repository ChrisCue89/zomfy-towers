# Recherche: Lagerglocke, Notfallwaffen, Verwundung, Training, Gedenken

*Zomfy Towers · 29.09.2026 · Grundlage für die Konzeptpunkte 6–10*

**Quellenlage:** Die Belege stammen aus der Websuche (das Kontingent der Sitzung war nach rund 40 eigenen Suchen erschöpft) und aus GitHub: Spieldaten-Spiegel, Decompilate und Zusammenfassungen von GDC-Vorträgen. Direkte Seitenabrufe waren gesperrt. Angaben mit **(V)** stammen aus Vorwissen und müssen vor einer Übernahme geprüft werden. [n] verweist auf die Quellenliste.

## Kurzfazit

- Spieler akzeptieren Permadeath, wenn der Tod die **Folge einer sichtbaren Entscheidung** ist, sich **ankündigt** und ein **Rettungsfenster** lässt – nicht, wenn ein einzelner Würfelwurf entscheidet. Für Zomfy heißt das: Tödlich wird es **nur nach dem Läuten**.
- Bewährt haben sich:
  - ein Zwischenzustand bei 0 LP (XCOM: 3–4 Runden, Darkest Dungeon: „Death's Door“),
  - kein Tod aus vollem Leben durch einen einzigen Treffer,
  - klare Warnsignale,
  - ein wählbarer Verlustmodus (Fire Emblem).
- Selten bleibt ein Notfallknopf nicht durch eine Abklingzeit, sondern durch drei Dinge: eine **Bedingung** (nur nach Durchbruch), **Einmaligkeit** (wie der Rasenmäher in Plants vs. Zombies) und **Folgen am nächsten Tag**.
- Training: **ein Regler pro Person** (Übungsstufe 0–3) statt vier Werten.
- Waffen: echte Waffen, warm inszeniert. Treffer setzen **Moder-Sporen und Laub** frei, nie Blut.
- Gedenken: klein und persönlich. Den Moment wählt der Spieler selbst; der Tod wird angedeutet, nicht gezeigt.

## 1. Permadeath: Was wirkt fair, was unfair?

**Fair.** Jake Solomon (XCOM): Wer echte Konsequenzen wie Permadeath einbaut, muss dafür sorgen, dass Spieler das Erlebnis als „völlig fair“ wahrnehmen. Nur dann binden sie sich an die Soldaten [1]. Dazu passt, dass XCOM 2 außer auf „Legende“ heimlich zugunsten des Spielers schummelt: auf den unteren Stufen Trefferchancen ×1,2, +10 nach jedem Fehlschuss, Boni, wenn Soldaten fallen [6].

Randy Smith (GDC 2023) unterscheidet zwei Arten von Zufall [32]:
- **Zufall vor der Entscheidung:** Der Spieler bekommt erst die Information und entscheidet dann (Into the Breach). Das fühlt sich fair an.
- **Zufall nach der Entscheidung:** Der Spieler legt sich fest, dann wird gewürfelt. Hängt dabei alles an *einem* Wurf, wirkt das unfair.

Seine Empfehlung: abgestufte Folgen und Werkzeuge, mit denen der Spieler gegensteuern kann.

**Unfair.** An Darkest Dungeon wird vor allem der Heldentod durch Pech kritisiert, etwa „nach 15–20 Stunden verloren“ [17]. Das Spiel bietet inzwischen Modi: „Radiant“ ist schneller und milder, „Stygian“ erlaubt höchstens 12 Tote in 86 Wochen [15]. In They Are Billions vernichtet ein einziger Durchbruch Stunden an Aufbau (V). Als unfair gelten außerdem:
- der Tod aus vollem Leben durch einen einzigen Treffer,
- der Tod außerhalb des Bildes ohne Warnung,
- Tode durch Fehler der Wegfindung, wenn kein Neuladen erlaubt ist.

**Rettungsfenster und Warnsignale:**
- **XCOM EU:** Kritisch Verwundete verbluten in 3 Runden; die laufende Runde zählt mit. Ein Medikit stabilisiert, „Wiederbeleben“ bringt sie mit 33 % LP zurück. Dauerhaft bleiben −10 Willenskraft [2].
- **XCOM 2:** Der Zähler steht auf 4 Runden (`BLEEDINGOUT_TURNS=4`) und ist über dem Kopf zu sehen [3]. Ob ein Soldat verblutet oder stirbt, hängt von seiner Willenskraft ab. Stabilisiert ist er bewusstlos mit 1 LP und muss hinausgetragen werden [4].
- **Darkest Dungeon:** Bei 0 LP ist der Held auf „Death's Door“. Jeder weitere Treffer tötet nur mit 33 % Wahrscheinlichkeit (Resistenz 67 %, höchstens 87 %); jede Heilung holt ihn zurück. Der Treffer, der ihn auf 0 bringt, tötet also nie [12].
- **RimWorld:** Blutverlust hat Stufen bei 15, 30, 45 und 60 %. Bei 60 % bricht die Figur zusammen, tot ist sie erst bei 100 % [29].
- **Fire Emblem:** Im Phoenix-Modus kehren Gefallene im nächsten Zug zurück [21]. Der „Göttliche Puls“ erlaubt 3 bis 13 Rücksprünge; laut Kritik stirbt damit kaum noch jemand [22].

**Schwierigkeitsoptionen.** Der Casual-Modus von Fire Emblem Awakening war im Team umstritten. Der Projektleiter Higuchi war dagegen, der Regisseur Yokota spielt selbst Casual – er mag die Figuren und will sie nicht sterben sehen [19]. Maeda sagt: Wer auf Klassisch scheitert, kommt auf Casual trotzdem ans Ende [20].

The Walking Dead: No Man's Land berichtet: Permadeath vertreibt einen Teil der Spieler, bindet aber die übrigen stärker [34]. Terraria koppelt die Härte des Verlusts an die Spielfigur (V). Manche Spieler legen sich Permadeath sogar selbst auf, etwa beim „Nuzlocke“ in Pokémon (V).

## 2. Verletzungsstufen und Erholung

- **XCOM 2:**
  - Stufen: „leicht verwundet“ bis 3 Tage, „verwundet“ bis 7 Tage, darüber „schwer verwundet“ (auf Legende 6 bzw. 14 Tage) [3].
  - Die Heilzeit ist zufällig: je nach verbleibenden LP zwischen 1–7 und 7–28 Tagen [5].
  - Das Advanced Warfare Center halbiert sie [7].
  - Die Krankenstation braucht 5 Tage je negativer Eigenschaft [9].
- **Darkest Dungeon:** Nach „Death's Door“ bleibt bis zum Ende der Expedition ein Malus: −2 Genauigkeit, −5 % Schaden, −1 Tempo, +10 % Stress [12]. Im Sanatorium fällt der Held eine Woche aus [16].
- **State of Decay 2:** Eine Verletzung senkt das Höchstleben, bis sie behandelt ist. Ein Verbandskasten heilt bis zu drei Verletzungen [23].
- **The Banner Saga (V):** Helden sterben nie im Kampf. Sie werden verletzt und brauchen Ruhetage; sterben können sie nur durch Entscheidungen in der Geschichte.
- **Stardew Valley (V):** Wer in der Mine umkippt, wacht in der Arztpraxis auf und hat etwas Geld und ein paar Gegenstände verloren.

**Muster:** drei Stufen plus Tod, Erholung in *Tagen*, ein Heiler verkürzt sie. Die eigentliche Strafe ist, dass Verletzte beim nächsten Einsatz fehlen.

## 3. Wie ein Notfallknopf selten und bedeutsam bleibt

- **Bedingung statt Abklingzeit:** Der Rasenmäher in Plants vs. Zombies startet erst, wenn ein Zombie das Haus erreicht. Er räumt die ganze Reihe und ist danach verbraucht (V). Unbenutzte Mäher werden am Ende des Levels zu Goldmünzen [30].
- **Fester Vorrat:** Enter the Gungeon füllt den Vorrat an „Blanks“ auf jeder Etage neu auf [31], standardmäßig auf zwei (V).
- **Sichtbare Kosten:**
  - Die Stadtglocke in Age of Empires II legt die Wirtschaft still (V).
  - Frostpunk kennt Notschichten, die Unmut und Todesgefahr bringen, und eine Überlast mit Druckanzeige (V).
- **Gegenbeispiel:** In Warcraft III ist „Zu den Waffen“ so billig, dass es zur Routine wird (V).
- **Rolle statt Leben verlieren:** In Kingdom Two Crowns verlieren getroffene Untertanen ihr Werkzeug (V) – eine milde Variante.

**Folgerung:** Ein Notfallknopf braucht
- einen Auslöser, der selbst schon ein Verlust ist,
- Einmaligkeit,
- Kosten am nächsten Tag,
- eine Belohnung in Form von Geschichte statt Beute.

## 4. Training: Wie viel Tiefe?

- **State of Decay 2:** vier Fähigkeiten, die durch Benutzung steigen, mit 1–7 Sternen und einer Spezialisierung [24]. Laut State-of-Decay-Wiki bietet der Trainingsplatz „Fitness“ für 3 Nahrung und 25 Einfluss (alle +10 Ausdauer) [25].
- **XCOM 2:** Ein Rekrut braucht 5 Tage in der Guerilla-Schule [7]. Die Bindungsstufen 2 und 3 kosten 3 bzw. 6 Tage [8].

Für 4–8 Bewohner ist das zu viel. Das Beispiel im Auftrag („Training: Stufe 2“) trifft die richtige Größe.

## 5. Waffen und Munition im warmen Ton

- **Spielgefühl:** Vlambeers „The Art of Screenshake“ zählt auf, was Schüsse gut anfühlen lässt: größere Geschosse, Mündungsfeuer, Rückstoß, Trefferstopp, liegenbleibende Hülsen, Kamerastoß, mehr Bass [36].
- **Gewalt ohne Blut:** This War of Mine zeigt Tote bewusst nicht direkt, sondern deutet sie an [33]. In Terraria lässt sich das Blut abschalten (V). Cult of the Lamb lebt vom Kontrast zwischen niedlich und brutal – für Zomfy ein Gegenbeispiel (V).
- **Munition und Lärm:**
  - State of Decay 2: Schüsse locken Zombies an, Schalldämpfer verschleißen [27].
  - The Walking Dead: No Man's Land: Schüsse rufen Beißer herbei [34].
  - Enter the Gungeon: Die Startwaffe hat unendlich Munition (V).
  - Stardew Valley: Die Schleuder verschießt Steine (V).
- **Rollen:** Die Waffen unterscheiden sich über Reichweite, Streuung und Tempo; im Nahkampf ist eine Waffe schwer, weit oder betäubend. Laute und leise Waffen stehen gegeneinander.

## 6. Gedenken ohne Kitsch

- **XCOM:** Die Gedenkwand von XCOM EU zeigt Rang, Name, Abschüsse, Einsätze, Operation und Datum; Enemy Within ergänzt Todesursache und Orden [10]. In XCOM 2 schreiben Spieler selbst Grabinschriften – rührende und komische [11].
- **Darkest Dungeon:** Der Friedhof nennt Name, Stufe, Klasse und Todesumstände [14].
- **RimWorld** rechnet Trauer in Stimmung [29]:
  - ein Kolonist gestorben: −3 für 6 Tage
  - ein Freund gestorben: −10 für 20 Tage
  - Ehepartner oder Kind gestorben: −20 für 30 Tage
  - Tote bleiben unbeerdigt: −10 bis zur Bestattung
- **State of Decay (Teil 1):** Ein Tod kostet 25–50 Moral. Wer den Rucksack des Toten birgt, bekommt etwas davon zurück [26].
- **Spiritfarer:** Der Spieler bestimmt selbst den Moment des Abschieds [35].

Berührend wirken ein persönliches Detail und eine selbst gewählte Handlung. Kippen lassen die Stimmung Trauer-Spiralen, gezeigte Leichen und Pathos.

## 7. Empfehlungen für Zomfy Towers

### 7.1 Grundregel

**„Tödlich wird es nur, wenn du die Glocke läutest.“**
- Posten (M23), Tagesleben und normale Nächte bleiben ohne Tod.
- Mit dem Läuten willigt der Spieler sichtbar ins Risiko ein – das ist der stärkste Hebel für Fairness [1][32].
- Die Horde wird **ohne** Glocke balanciert: `balance.mjs` rechnet ohne sie.

### 7.2 Die Lagerglocke

| Regel | Wert |
|---|---|
| Bau | „Lagerglocke“ im Hof am Feuer, einmalig (z. B. Balduins alte Schiffsglocke) |
| Freigabe | nur nachts nach einem Durchbruch (Tor gefallen oder Schlurfer im Lager) |
| Auslösen | Mika steht an der Glocke und hält E 1,5 s. Dabei zeigt die Tafel „Wer kommt?“ Name, LP, Waffe und Munition. Kein Dialog, keine Taste von überall. |
| Häufigkeit | 1× je Nacht |
| Wo gekämpft wird | nur innerhalb des Walls |
| Ende | 20 s nachdem das Lager frei ist, spätestens im Morgengrauen: drei Schläge zur „Entwarnung“ |
| Solange die Glocke läutet | Zeitraffer aus, N gesperrt |
| Kosten | Munition. Wer gekämpft hat, ist am nächsten Tag erschöpft: seine Fähigkeit ruht bis 12 Uhr, kein Training. Verletzung und Tod sind möglich. |
| Lohn | Beziehung +1 zwischen allen Beteiligten, eine Szene am Feuer, der Morgenbericht erzählt, wer was getan hat, Taten im Herbstbuch |

### 7.3 Zu Boden, Rettung, Tod

- **Leben:** Bewohner haben 80 LP, +20 je Übungsstufe.
- **Schutz vor dem Sofort-Tod:** Ein Treffer nimmt höchstens 40 % der vollen LP. Es braucht also mindestens 3 Treffer, bis jemand am Boden liegt.
- **Rückzug:** Bei 25 % LP zieht sich ein Bewohner ins Haus zurück, sofern der Weg frei ist. Zu Boden geht nur, wer eingekesselt ist.
- **Zu Boden (0 LP):**
  - Warnsignale: ein Ring als Countdown, Herzschlag, eine Randmarke mit Porträt und der Ruf „Mika!“.
  - Schlurfer lassen Liegende in Ruhe.
  - Auf „Wild“ läuft die Uhr doppelt so schnell, solange ein Schlurfer daneben steht.
- **Rettung:**
  - Mika hält E 2 s: Die Uhr bleibt stehen, der Bewohner humpelt ins Haus.
  - Dr. Yusuf kämpft nicht; er stabilisiert jeden im Umkreis von 6 m nach 4 s.
  - Ist das Lager frei, gelten alle Liegenden als gerettet.
- **Tod:** nur, wenn die Uhr abläuft. Der Tod wird sofort gespeichert.
- **Knopf stirbt nie:** Er verkriecht sich und ist am Morgen wieder da (V: Der Tod eines Tieres kippt den Ton).

### 7.4 Verletzungen

| Stufe | Auslöser | Dauer (Ausgewogen) | Folge |
|---|---|---|---|
| erschöpft | hat gekämpft | bis 12 Uhr | Fähigkeit ruht, kein Training |
| verletzt | Nacht mit ≤ 50 % LP beendet | 2 Tage | Fähigkeit wirkt nur halb; folgt der Glocke nicht |
| schwer verletzt | war zu Boden | 4 Tage | Fähigkeit aus, bleibt im Zelt; Dr. Yusuf und ein Bett im Haus kürzen um je 1 Tag (mindestens 1 Tag) |
| Narbe | nach „schwer verletzt“ | dauerhaft | nur Aussehen und eine Dialogzeile |

### 7.5 Notfallwaffen

| Waffe | Rolle | Reichweite | Takt | Magazin/Vorrat | Besonderheit |
|---|---|---|---|---|---|
| Jagdgewehr | Präzision | 12 m | 1/1,6 s | 5/15 | durchschlägt einen Schlurfer; laut |
| Doppelflinte | Nahbereich | 5 m, Fächer 40° | 2 Schuss, dann 2,5 s laden | 2/12 | stößt 1,5 m zurück; sehr laut |
| Pistole | Allround | 8 m | 1/0,6 s | 8/24 | schwach; mittellaut |
| Signalpistole (Vorschlag) | Licht | 10 m | 1/3 s | 1/4 | blendet 4 s, Lichtinsel für 20 s, macht den Moder müde |
| Axt | Nahkampf, schwer | 1,2 m | 1/1,2 s | – | hoher Schaden, leise |
| Mistgabel | Nahkampf, weit | 1,8 m | 1/1,0 s | – | stößt 1 m zurück, die sicherste Waffe |
| Baseballschläger | Nahkampf, schnell | 1,2 m | 1/0,7 s | – | betäubt 0,8 s |

- **Lärm:** Laute Waffen ziehen Schlurfer im Umkreis von 8 m zum Schützen.
- **Nie wehrlos:** Ist das Magazin leer, schlägt der Bewohner mit dem Kolben zu. Es gibt keinen Eigenbeschuss.
- **Munition:**
  - Sie liegt in einer Waffenkiste im Haus und wird verbraucht, wenn die Glocke läutet und beim Schießtraining. Sie verfällt nicht.
  - Nachschub: Patronen bei Balduin (z. B. 6 für 2 Zombieteile, höchstens 12 am Tag), Schrot aus Schrott an der Werkbank.
- **Darstellung:**
  - Mündungsfeuer: 2 Bilder, dazu Rauch für 0,5 s. Die Hülsen bleiben bis zum Morgen liegen.
  - Rückstoß: 1–2 px. Treffer halten das Bild kurz an.
  - Treffer: ein weißer Blitz und violette Sporen. Erledigte Schlurfer sinken zu einem Haufen aus Moos und Laub zusammen.
  - Ton: ein tiefer Knall mit Hall über dem See, Krähen fliegen auf, Knopf bellt. Bei leerem Magazin ein komischer Klick („Na toll.“).
- **Wer trägt was:** Oma Hilde die Doppelflinte, Bert die Axt, Juna die Signalpistole. Dr. Yusuf bleibt Sanitäter ohne Waffe.

### 7.6 Training

- **Der Platz:** Heuballen, Kürbisse als Zielscheiben und eine Strohpuppe mit Kochtopf-Helm.
- **Übungsstufe 0–3:** Sie braucht 2/3/4 Sitzungen, insgesamt 9. Das Profil jeder Figur ist fest, etwa „Juna schnell, aber schreckhaft“.
- **Sitzung:** 2 Spielstunden, höchstens eine je Tag. Solange ruht die Fähigkeit des Bewohners. Schießübung kostet 3 Schuss. Mit Mika zusammen stärkt sie auch die Beziehung.
- **Wirkung je Stufe:**
  - +20 LP
  - +8 Punkte Treffsicherheit (Basis 60 %)
  - −10 Punkte „Schreck“ (Basis 30 %; Schreck bedeutet 1 s Zögern auf 2 m)
- Eine überlebte Glockennacht zählt als Sitzung.

### 7.7 Gedenken

- **Erinnerungsbrett am Steg:** Mit Wäscheklammern hängen dort ein Foto (aus dem Porträt-Renderer), der Name und „Tag 7–19“. Darunter liegt ein persönlicher Gegenstand, daneben steht eine Kürbislaterne.
- **Morgenbericht:** eine ruhige Zeile ohne Leiche – man habe sie „zum Steg gebracht“.
- **Kleines Ritual:** Abends kann Mika mit E die Laterne anzünden, dazu erscheint eine Erinnerungszeile. Die anderen Bewohner sprechen noch einige Tage von der Person.
- **Keine Spirale:** kein Stimmungsmalus, niemand zieht weg.
- **Andenken:** Die Karten von Hannes werden als Kartenrückseite für „Letzte Runde“ wählbar. Im Herbstbuch kommt eine Seite „Die mit uns waren“ dazu.
- **Das Leben geht weiter:** Der frei gewordene Zeltplatz kann einen Gast aufnehmen.

### 7.8 Nach Schwierigkeit

| | Gemütlich | Ausgewogen | Wild |
|---|---|---|---|
| Verluste | aus (beim Start wählbar; später nur noch Wechsel von „an“ zu „aus“) | an | an |
| Zu-Boden-Fenster | kein Tod; wer liegt, verliert seine Waffe | 60 s | 40 s, doppelt so schnell mit Schlurfer daneben |
| Höchstschaden je Treffer | 30 % | 40 % | 50 % |
| verletzt / schwer verletzt | 1 / 2 Tage | 2 / 4 Tage | 3 / 5 Tage |

### 7.9 Technik

- **Spielstand:** Leben, Verletzung, Übungsstufe, Waffe, Munition und die Gedenkliste kommen neu hinein. Dafür `SAVE_VERSION` erhöhen und eine Migration schreiben (Regel 6).
- **Licht:** Das Mündungsfeuer ist ein leuchtender Sprite oder eine Lichtinsel, nie ein zusätzliches Punktlicht (Regel 7).
- **Namen abgrenzen:** Es gibt schon die Alarmglocke am Tor und die „Sturmglocke“ des Glockenturms. Deshalb heißt die neue „Lagerglocke“.
- **Prüfpunkte:**
  - Glocke nur nach Durchbruch und nur einmal je Nacht
  - Uhr beim Zu-Boden-Gehen
  - Rettung mit echter Taste
  - Erinnerungsbrett nach einem Tod
  - Migration

## Quellen

1. Jake Solomon, Interview: https://www.pcgamesn.com/xcom-2/xcom-jake-solomon-interview
2. XCOM EU, kritische Wunden: https://xcom.fandom.com/wiki/Soldier_(XCOM:_Enemy_Unknown)
3. XCOM-2-Konfiguration (`BLEEDINGOUT_TURNS=4`; `WoundStates` 72/168 h, Legende 144/336 h): https://github.com/daakru/x2wotc-common-configs
4. Verbluten: https://xcom.fandom.com/wiki/Bleeding_out
5. Heilzeiten: https://steamcommunity.com/app/268500/discussions/0/412447331650027820/
6. Versteckte Zielhilfe: http://www.vigaroe.com/2020/05/xcom-2-analysis-difficulty-levels.html
7. Guerilla-Schule und AWC: https://strategywiki.org/wiki/XCOM_2/Guerrilla_Tactics_School
8. Bindungen: https://www.gamepressure.com/xcom2/soldier-relations/z9a107
9. Krankenstation: https://twinfinite.net/guides/xcom-2-war-chosen-how-negative-traits/
10. Gedenkwand: https://kotaku.com/remembering-the-fallen-and-the-decisions-for-which-the-5916627, https://www.ufopaedia.org/index.php/Barracks_(EU2012)
11. Grabinschriften: https://stevivor.com/reviews/review-xcom-2/, https://steamcommunity.com/app/268500/discussions/0/412446890547438786/
12. Death's Door: https://darkestdungeon.wiki.gg/wiki/Death's_Door_(Darkest_Dungeon)
13. Stress: https://darkestdungeon.wiki.gg/wiki/Affliction
14. Friedhof: https://darkestdungeon.wiki.gg/wiki/Graveyard
15. Spielmodi: https://darkestdungeon.wiki.gg/wiki/Game_Modes
16. Sanatorium: https://darkestdungeon.wiki.gg/wiki/Sanitarium
17. Kritik am Zufall: https://www.resetera.com/threads/what-are-your-thoughts-on-permadeath-specifically-darkest-dungeon.95661/, https://gamegeeker.com/games/darkest-dungeon-262060/review
18. Sigman, Postmortem (GDC 2016): https://gdcvault.com/play/1023089/Darkest-Dungeon-A-Design
19. Casual-Modus: https://www.engadget.com/2013-04-03-intelligent-systems-divided-over-fire-emblem-awakenings-casual.html
20. Iwata fragt: https://iwataasks.nintendo.com/interviews/3ds/fire-emblem/0/2/
21. Phoenix-Modus: https://fireemblem.fandom.com/wiki/Phoenix_Mode
22. Göttlicher Puls: https://fireemblemwiki.org/wiki/Divine_Pulse, https://untimelygamer.medium.com/fire-emblem-three-houses-still-doesnt-know-how-to-handle-death-175a95138ec7
23. Verletzungen: https://state-of-decay-2.fandom.com/wiki/Facility:_Infirmary
24. Fähigkeiten: https://state-of-decay-2.fandom.com/wiki/Skills
25. Trainingsplatz: https://stateofdecay.fandom.com/wiki/Training_Area
26. Tod und Moral: https://stateofdecay.fandom.com/wiki/Character_Death
27. Lärm: https://www.imfdb.org/wiki/State_of_Decay_2
28. Schwierigkeit: https://support.stateofdecay.com/hc/en-us/articles/360025827271-Update-7-0-Choose-Your-Own-Apocalypse
29. RimWorld-Kerndaten (Thoughts_Memory_Death.xml, Thoughts_Situation_Special.xml, Hediffs_Global_Misc.xml): https://github.com/mezunnk/RimWorld/tree/4273a3116006d2b42d929045e8ec529e99a2a253/Core/Defs
30. Decompilat von Plants vs. Zombies (Board.cpp, `COIN_MOTION_LAWNMOWER_COIN`): https://github.com/Patoke/re-plants-vs-zombies
31. Decompilat von Enter the Gungeon (`NumBlanksPerFloor`): https://github.com/fedes1to/EtG-source
32. Randy Smith, „Cards, Dice, and RNGs“ (GDC 2023): https://www.gdcvault.com/play/1028984
33. Pawel Miechowski, This War of Mine (GDC Europe 2015): https://www.gdcvault.com/play/1022335
34. Sulka Haro, Postmortem zu The Walking Dead: No Man's Land (GDC 2016): https://www.gdcvault.com/play/1023506
35. Wettbewerb „Narrative Review“ (GDC 2022), zu Spiritfarer: https://www.gdcvault.com/play/1027837
36. „The Art of Screenshake“: https://www.youtube.com/watch?v=AJdEqssNZ-U, „Juice it or lose it“: https://www.youtube.com/watch?v=Fy0aCDmgnxg (Links geprüft, Inhalt V)
37. Sid Meier (GDC 2010): https://www.youtube.com/watch?v=bY7aRJE-oOY (Inhalt V)

Zusammenfassungen zu 32–35: https://github.com/rochero/gdcvault_summary
