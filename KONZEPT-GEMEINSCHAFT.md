# Konzept: Gemeinschaft – Besucher, Bewohner, Lagerglocke, „Letzte Runde“

Stand: 28.09.2026 · **Entschieden am 29.09.2026:** OFFENE-FRAGEN 161–176, Plan
M26–M33 in DESIGN.md (Abschnitt 8, »Der Plan ab M26 – Zuflucht sein«), Recherche
in `recherche/`. Abweichungen von dieser Analyse: **echte Waffen** statt
Werkzeug (Wunsch des Auftraggebers, Nr. 168) und die **geprüften Kartenregeln**
aus `recherche/kartenspiel.md` (Nr. 172). Die Analyse bleibt als Begründung
stehen.

Grundlage: das Designkonzept des Auftraggebers (Punkte 1–24) und der Code auf
dem Stand von M24. Zahlen zum Kartenspiel stammen aus einem kleinen Simulator
(20 000 Partien je Variante, einfache Regel-KI; die Zahlen zeigen Richtungen,
keine Endwerte).

---

## A. Gesamturteil

**Das passt sehr gut – besser als fast alles, was bisher auf dem Plan stand.**
Mikas Aufgabe ist laut Geschichte (M15) „die Nächte halten, ein Zuhause bauen,
Zuflucht sein“. Tag (sammeln, bauen) und Nacht (verteidigen) sind ausgebaut;
das Zuflucht-Sein, also die Menschen, ist die fehlende dritte Hälfte. Die
Ideen füllen genau diese Lücke und geben der Verteidigung eine emotionale
Fallhöhe, die kein Turm liefern kann.

Vieles davon gibt es im Code schon als Keim: fünf Überlebende mit den Stufen
„angekommen → zu Gast → eingezogen“, Zelte als Plätze, Fähigkeiten (Bert
flickt, Yusuf heilt, Hilde tauscht, Juna funkt), Aufträge, Posten auf dem
Hochsitz und das Fest am Feuer (M23), Möbel und Gemütlichkeit, Balduins Boot
mit festem Fahrplan, Junas Funk, Wetter, der Kamin im Innenraum, Musik aus
Notendaten, Porträts mit Gesichtsausdrücken.

Drei Punkte würde ich **deutlich ändern**:

1. **Keine Schusswaffen.** Im Spiel ist alles handgemacht (Axt, Pfanne,
   Bolzenwerfer, Katapult, Sprenger). Gewehre brechen den Ton. Besser passen
   improvisierte Werkzeuge, Licht und Wasser – und das stützt sogar die
   Geschichte: Licht macht den Moder müde, Wasser spült ihn ab.
   *(Überholt am 29.09.2026: Der Auftraggeber findet Waffen besser – echte
   Waffen, warm inszeniert, ohne Blut, OFFENE-FRAGEN 168.)*
2. **Permadeath nur als Folge einer bewussten Entscheidung** (die Glocke),
   mit einem fairen Rettungsfenster, nie durch Zufall – und auf „Gemütlich“
   gar nicht.
3. **„Letzte Runde“ braucht Regelkorrekturen.** Ohne Zugzwang platzt niemand
   (man kennt ja die eigenen Karten), ohne Gleichstandsregel enden 23 % der
   Partien unentschieden, und der Startspieler hat einen spürbaren Vorteil.
   Eine verbesserte Fassung steht in Abschnitt E.

**Größtes Risiko: der Umfang.** Realistisch ist das ein eigener Block von fünf
bis sechs Meilensteinen. Außerdem dürfen die Bewohner die gerade balancierte
Verteidigung nicht aushebeln.

---

## B. Integration – woran die Systeme anschließen

| Idee | Bestehendes System | Was neu dazukommt |
|---|---|---|
| Besucher, neue Bewohner | `survivors` (Stufen 0–3), feste Ankunftsorte (Hilde am Hofeingang, Juna am Steg, Yusuf am Strand, Bert über den Weg), `npcs.js` (Laufen, Winken) | ein Pool weiterer Personen, Ankunftsplan aus dem Startwert |
| Ankunft mit dem Boot | Balduins Fahrplan (Boot jeden Morgen ab Tag 2, Abfahrt 12:00) | Passagiere an Bord (an und ab) |
| Ankündigungen, Nachrichten | Junas Funk (sagt schon die Horde der Nacht an), Morgenbericht | Funksprüche und Briefe aus anderen sicheren Orten |
| Begrenzte Plätze | Bau `zelt` (1 Platz, höchstens 4, kann im Durchbruch umfallen) | `huette` (2 Plätze), Gästezimmer im Haus (Stufe 5) |
| Gästeplatz | Stufe 2 „zu Gast“ gibt es schon (Gäste schlafen am Feuer) | Frist (eine Nacht), Entscheidung am Morgen |
| Persönlichkeit | `dialogs.js`, Porträts mit Ausdrücken, Sprechblasen, Figuren-Baukasten (N1), `looks.js` | Charakterzüge, Eigenheit, Tischgespräche |
| Lagerglocke | Durchbruch-Logik M17 (`night.breach`, Schlurfer im Lager plündern), Posten M23 (Nerven, Rückzug) | Glocke am Haus, Kampf-KI der Bewohner |
| Verwundung | Yusuf (verarztet Mika einmal je Nacht, Tee), Mikas Ohnmacht (Abblende), Bett | Zustände je Bewohner, Genesung in Tagen |
| Training | „Werkeln“/Ausruhen (Zeit vergeht mit Abblende), Werkbank, `weapons.js` | Übungsplatz, ein Übungswert, Notfallwerkzeug |
| Erinnerung | Lichtinseln (`lightPools`, keine neue Lichtquelle), Requisiten | Erinnerungslaterne, Foto auf dem Kaminsims |
| Freizeit, Kartenspiel | Feuerstelle im Hof, Kamin im Innenraum (M11), Wetter (M12) wählt drinnen oder draußen, Nah-Ansicht 160 px/m (M13), Musik (M10d), Fest am Feuer (M23) | Modus `cards`, Tisch-Oberfläche, Stück „Kartenabend“ |
| Belohnungen | Möbel und Gemütlichkeit (`furniture.js`), Mützen (`looks.js`), Herbstschmuck | Kartenrückseiten, Deko, Schallplatten |
| Beziehungen | Aufträge, Morgengaben, Fest | interner Wert aus gemeinsamen Momenten |

---

## C. Probleme und Widersprüche

1. **Posten (M23) widersprechen „Bewohner kämpfen normalerweise nicht“.** Seit
   M23 stehen Bewohner jede Nacht auf dem Hochsitz: Bert flickt, Yusuf heilt,
   Juna blendet, **Hilde wirft Glas (Schaden)**, **Knopf beißt (25 Schaden)**.
   Das ist ein Stück der „kostenlosen Turm-Einheit“, die vermieden werden
   soll. → Vorschlag in D.
2. **Heute gibt es keine Knappheit:** vier Zelte für vier Menschen – nie eine
   Wahl. Knappheit braucht mehr Bewerber als Plätze, also neue Personen.
3. **Feste Namen im Code:** `bert`, `yusuf`, `juna` … sind in Fähigkeiten,
   Posten, Aufträgen, Dialogen, Modellen, Porträts und im Prüfskript
   verdrahtet. Ein offener Personen-Pool braucht zuerst einen Umbau auf
   datengetriebene Personen. Das ist der teuerste, aber wichtigste Vorbau.
4. **Stammbesetzung und Tod:** Junas Leuchtfeuer, Yusufs Rettung, Berts
   Reparatur und die Aufträge (Garn, Antenne, Werkzeug, Proben) hängen an
   Personen. Stirbt jemand, müssen Bauten weiter funktionieren (der Leuchtmast
   leuchtet weiter), Aufträge sauber enden und Dialoge verschwinden, ohne dass
   etwas hängt.
5. **Es gibt keine Nahrung.** Gärtnerin und Jäger setzen eine
   Versorgungswirtschaft voraus. Ein Hunger-System wäre ein weiteres großes
   System mit viel Frust-Potenzial. → Fähigkeiten an Bestehendes hängen
   (Kürbisse für Kürbiswurf, Fest und Laternen; Suppe heilt; Holz- und
   Schrott-Ertrag).
6. **Es gibt keinen Strom.** Ein Elektriker hätte nichts zu verbessern. →
   Weglassen oder als „Laternenmacherin“ an das Licht koppeln (Lampen,
   Leuchtfeuer, Laternenturm – Licht ist das Anti-Moder-Element).
7. **Schusswaffen und Munition:** Stilbruch, Lautstärke, Gewaltbild, dazu eine
   Munitionswirtschaft. → Improvisiertes Werkzeug, keine Munition.
8. **Balance:** Die Boni von sechs bis acht Bewohnern stapeln sich. Der
   Balance-Durchlauf aus M24 zeigt ohnehin schon, dass das Spiel eher zu
   leicht ist. → Boni klein, verschieden, überwiegend nicht-kämpferisch.
9. **Die Glocke als Standardzug:** Bringt sie Beute oder Erfahrung oder kostet
   sie nichts, läutet man sie jede Nacht. → F.
10. **Horde-KI:** Schlurfer greifen heute Mika, Barrikaden, Tor und
    Lager-Bauten an. Für die Glocke müssen sie auch Bewohner angreifen – ein
    Eingriff in `horde.js`, der alle bestehenden Nacht-Prüfungen berührt. →
    Nur aktiv, solange die Glocke läutet.
11. **Zeit fürs Kartenspiel:** Eine Partie dauert 5–8 echte Minuten. Liefe die
    Uhr weiter, fräße sie die Abendvorbereitung auf. → Eigener Modus, die Uhr
    steht, danach wird eine feste Spielzeit abgebucht (etwa 30 Minuten).
12. **Schrift:** 🍂🔥🌙🐦‍⬛ gibt es in der Pixelschrift nicht. Farben werden
    Pixel-Symbole (`icons.js`), nie Textzeichen.
13. **Tasten:** G ist in der Bauleiste belegt (Q R T G C V). Die Glocke braucht
    einen eigenen Weg (E an der Glocke oder eine gehaltene Taste im Notfall).
14. **Verführerisch, aber falsch:** Die Geschichte (der Moder macht Menschen
    zu Schlurfern) lädt dazu ein, Gefallene als Schlurfer wiederkehren zu
    lassen. Das wäre Horror statt Melancholie – ausdrücklich nicht.

---

## D. Verbesserungen

### Personen

- **Handgeschrieben statt zufällig erzeugt:** ein Pool von 12–16 Wanderern
  plus die fünf Stammbewohner. Jede Person hat Name, Beruf, Fähigkeit, drei
  Charakterzüge, eine Eigenheit, einen Kartenstil, ein Erinnerungsstück,
  einen Ankunftsweg und ein Lieblingswerkzeug. Je Spiel kommt eine Auswahl in
  zufälliger Reihenfolge (aus dem Startwert). Nur mit echten Figuren entsteht
  „Mist, dann müsste Hannes gehen“.
- **Die Fähigkeit ist sofort sichtbar, die Persönlichkeit entdeckt man.** Eine
  Entscheidung ohne Wissen um die Fähigkeit wäre unfair. Charakter,
  Eigenheit und Geschichte kommen über Gespräche, Karten und das Fest.
- **Fähigkeiten verschieden statt +x %:** Zimmermann flickt Holz über Nacht,
  Mechanikerin macht Turm-Ausbauten billiger, Försterin lässt Bäume schneller
  nachwachsen, Fischer handelt besser mit Balduin (er kennt die Leute vom
  Wasser), Laternenmacherin macht Lampen heller, Köchin verstärkt die Suppe,
  Postbotin bringt Nachrichten und Pakete aus dem Netzwerk schneller,
  Musiker hebt die Gemütlichkeit und bringt Musikstücke mit.
- **Eigenheit mit kleiner Wirkung:** „Hannes mag schlechtes Wetter“ → bei
  Regen flickt er mehr. So verbindet die Persönlichkeit sich mit der Mechanik,
  ohne dass daraus ein Werte-System wird.
- **Jeder Beruf nur einmal je Spiel** (keine zwei Ärzte, deren Boni sich
  stapeln).

### Plätze und Gästeplatz

- Zu Beginn zwei Zelte, höchstens drei; ab etwa Tag 10 die Hütte (2 Plätze,
  höchstens zwei); mit Haus-Stufe 5 das Gästezimmer (+1). Das ergibt
  höchstens 8 Bewohner plus Knopf. Über 30 Tage kommen etwa 13 Menschen
  (4 Stammbewohner, rund 9 Wanderer) – etwa fünf muss man weitervermitteln.
- Keine Versorgung, kein Unterhalt: Der Preis eines Platzes ist der Bau und
  die Entscheidung.
- **Gästeplatz:** eine Bank bzw. Hängematte am Feuer (1 Gast, später 2). Der
  Gast bleibt eine Nacht, bis Balduin am nächsten Mittag ablegt; mit einem
  Tee lässt sich ein Tag verlängern. Die Entscheidung ist ein ruhiges
  Gespräch am Morgen: „Bleib bei uns“ oder „Balduin bringt dich zur
  Nordinsel“ – das Ziel passt zur Person (der Fischer auf die Insel, die
  Försterin ins Forsthaus).
- **Wer schon wohnt, darf auch gehen:** Damit die Mechaniker-Frage
  überhaupt entsteht, kann ein Bewohner auf eigenen Wunsch weiterziehen, mit
  Abschied und Platz im Netzwerk. Niemand wird hinausgeworfen.
- **Die ersten Tage nicht überfrachten:** Die Stammbesetzung kommt wie
  bisher an den Tagen 2–6; die erste echte Wahl frühestens um Tag 7–8.

### Netzwerk – ja, und technisch überschaubar

- Vier bis sechs sichere Orte als reine Erzählorte (Nordinsel, Forsthaus,
  Alte Farm, Leuchtturm, Ferienlager). Es gibt keine Simulation, nur eine
  Liste mit Zeitplan.
- Nach 2–4 Tagen kommt eine Nachricht über Balduin oder Junas Funk („Clara
  ist gut auf der Nordinsel angekommen“), gelegentlich ein Paket (ein paar
  Rohstoffe, ein Möbelstück, eine Kartenrückseite), selten ein Besuch –
  vielleicht auf ein Kartenspiel.
- **Anschluss an das Finale (M25):** In der Frostnacht leuchten auf den
  anderen Orten Signalfeuer, und wer vermittelt wurde, schickt eine kleine
  Hilfe. So zahlt sich „wir helfen trotzdem“ aus.

### Glocke, Posten, Training, Erinnerung

- **Posten werden reine Unterstützung ohne Risiko:** flicken, heilen,
  leuchten, bremsen – ohne Schaden. Knopf bellt und schubst, beißt aber
  nicht. Die Trennung ist dann klar: **Posten = Alltag, sicher. Glocke =
  Notfall, echte Gefahr.** Die Glocke holt die Bewohner vom Hochsitz herunter.
- **Die Glocke ist die Essensglocke am Haus:** Dreimal kurz ruft sie zum
  Essen und zum Kartenabend, Sturmläuten ruft alle hinaus. Eine Glocke für
  beides verbindet Freizeit und Notfall – und verwechselt sich nicht mit dem
  Turm „Glockenturm“ und der Friedensglocke (M19).
- **Training:** ein Wert „Übung“ (0–3: ungeübt, geübt, sicher, erfahren)
  statt vier Werten. Übungsplatz aus Strohballen, Blechdosen an einer Leine
  und einer alten Fass-Zielscheibe. Eine Einheit kostet eine Stunde Tageszeit
  (mit Abblende) und etwas Fasern und Holz. Dazu ein Notfallwerkzeug je
  Person (an der Werkbank gebaut): Mistgabel (schubst), Pfanne (betäubt),
  Schleuder (auf Abstand), Fackel (blendet), Gießkanne (Wasser spült den
  Moder ab, bremst stark), Armbrust (stark, langsam). Keine Munition. Jede
  Person hat ein Lieblingswerkzeug mit kleinem Vorteil.
- **Erinnerung:** eine Erinnerungslaterne am Steg, eine je Verstorbenem, mit
  Namen und Erinnerungsstück; sie leuchtet jede Nacht (als Lichtinsel, ohne
  Punktlicht). Dazu ein Foto auf dem Kaminsims. Das passt zum Ton –
  Laternen sind im Spiel das Zeichen gegen den Moder. **Kein Bonus durch
  einen Tod**, sonst würden Verluste belohnt.
- **Beziehungen:** ein interner Wert je Person aus gemeinsamen Momenten
  (Karten, Fest, Aufträge, das tägliche Gespräch, Geschenke). Spürbar wird er
  über neue Gesprächszeilen, kleine Gesten (setzt sich neben Mika, nennt sie
  beim Spitznamen), Geschenke und Einträge im Herbstbuch (M25) – nie als
  Zahl oder Herzchen. **Freundschaft ist kein Kampfwert.**

### Belohnungen des Kartenspiels

- Nur Kosmetik und Gemütlichkeit (Möbel, Pflanzen, Teppiche, Lampen, Tassen,
  Schallplatten mit neuen Musikstücken, Kartenrückseiten, Mützen).
- **Persönliche Einsätze:** Die Figur setzt ihr Stück („Schlägst du mich,
  gehört die Laterne dir“). Mika setzt keine Rohstoffe, sondern eine lustige
  Pflicht („Wer verliert, spült ab“ oder „trägt morgen meine Mütze“ – dann
  trägt Mika sie wirklich). Kein Glücksspiel mit Rohstoffen.
- Kosmetische Turm- und Barrikaden-Varianten nur als Details (Wimpel,
  Anstrich), nie als neue Form – die Silhouette jeder Art muss lesbar
  bleiben.

---

## E. „Letzte Runde“ geprüft

### Befunde zur Ausgangsidee

1. **Ohne Zugzwang platzt niemand.** Wer frei entscheidet, wo und ob er legt,
   kennt seine Karten und überschreitet 15 nie – dann ist „über 15 verliert“
   bedeutungslos. Das Spiel braucht **Zugzwang**: Jeder Zug muss eine Karte
   legen, höchstens drei je Platz. Dann kann einen die eigene Hand am Ende
   zwingen – das ist die Spannung.
2. **Offene Stellen:** Zugfolge, Nachziehen, Spielende und Gleichstand waren
   nicht festgelegt. Ergänzt unten.
3. **Unentschieden:** Ohne Gleichstandsregel endeten im Simulator **23 %** der
   Partien unentschieden (beide 15, beide geplatzt). Mit der Regel
   „Volltreffer, dann Abstand zu 15“ sind es **2 %**.
4. **Startspieler-Vorteil:** 53 : 45. Bekommt der Nachziehende sechs statt
   fünf Handkarten, sind es **48,5 : 49,3**. Zusätzlich wechselt der Anfang.
5. **Klopfen funktioniert:** Es wird etwa 1,8-mal je Partie genutzt (beide
   zusammen) und halbiert die erzwungenen Platzer (0,41 → 0,17 geplatzte
   Plätze je Partie). Einmal je Partie ist richtig.
6. **Farbpaare:** Krähe (56 % Siegquote nach dem Auslösen) und Feuer (54 %)
   sind stärker als Blatt (49 %) und Mond (46 %). Mond ist unterschätzt, weil
   die Simulator-KI Wissen nicht nutzt – trotzdem nachschärfen. Die Feinwerte
   entscheidet ein Simulator, nicht das Gefühl.
7. **Länge:** 17–18 Züge je Partie, also 2–3 Minuten. Ein Abend „bis zwei
   Siege“ dauert **5–8 Minuten** ✓.
8. **Vier statt drei Karten je Platz:** mehr Platzer (0,93 je Partie), längere
   Partien, kaum mehr Tiefe. Drei ist besser.

### Gedanklich durchgespielt

- **Die frühe 15:** Du hast an Platz A offen 9 + 6 = 15 und einen freien
  Platz. Mit Zugzwang müsstest du am Ende vielleicht dorthin legen und
  platzen – das fühlte sich an wie eine Strafe fürs Gutspielen. →
  **Volltreffer-Regel:** Genau 15 schließt den Platz für dich („Fünfzehn –
  zu!“). Das ist ein kleiner Jubelmoment statt einer Falle.
- **Der Bluff:** Der Gegner zeigt an B offen 8 und eine verdeckte Karte. Du
  hast 12 offen und einen freien Platz, auf der Hand 7 und 9. Liegt er bei
  13, bei 17 (geplatzt) oder bei 9? Gibst du B auf und lädst dort deine 9 als
  „Opferplatz“ ab, oder hoffst du, dass er geplatzt ist? Genau die
  Poker-Frage, ohne Poker zu kopieren.
- **Klopfen als Druck:** Du liegst an C bei 7 + verdeckt 6 = 13, der Gegner
  bei 9. Du klopfst. Er hat genau einen Zug: Mit seiner 5 käme er auf 14 und
  gewönne – aber vielleicht liegst du bei 16, dann gewönne er mit jeder
  Karte, und die 5 fehlte ihm an A. Spannend, kurz und verständlich.
- **Zugzwang am Ende:** Auf der Hand 8 und 9, die offenen Plätze stehen bei 12
  und 10 – du musst legen und platzt. Wer seine kleinen Karten zu früh
  verbraucht, zahlt am Ende. Das ist Kartenkenntnis wie bei guten
  Stichspielen.
- **Das Krähenpaar:** Zwei offene Krähen an A; du tauschst deine 9 gegen
  seine 3 – du fällst von 17 (geplatzt) auf 11, er steigt von 12 auf 18. Ein
  riesiger Moment, aber es gibt Gegenspiel: Verdeckte Karten sind vor der
  Krähe sicher.

### Verbesserte Regeln (Vorschlag)

**Grundspiel** (in einer Minute erklärt):

1. 36 Karten: Blatt, Feuer, Mond und Krähe, je 1 bis 9. Wer anfängt, hat
   fünf Karten auf der Hand, der andere sechs.
2. In der Mitte liegen drei Plätze. Wer dran ist, **muss** genau eine Karte an
   einen eigenen Platz legen (höchstens drei je Platz) und zieht dann nach.
3. Je Platz darf eine eigene Karte verdeckt liegen.
4. **Genau 15 = Volltreffer:** Der Platz ist für dich zu.
5. **Klopfen, einmal je Partie** (statt zu legen, an einem Platz mit
   mindestens zwei eigenen Karten): Der Platz ist für dich zu, der andere hat
   dort noch genau einen Zug, dann wird aufgedeckt.
6. Wertung je Platz: näher an 15 gewinnt, über 15 ist geplatzt. Bei gleicher
   Summe gewinnt, wer weniger Karten braucht.
7. Wer zwei Plätze hat, gewinnt. Bei Gleichstand zählen erst die
   Volltreffer, dann die Nähe zu 15 über alle Plätze.
8. Ein Abend geht bis zu zwei Siegen, der Anfang wechselt.

**Farbpaare** als zweite Stufe – eine Figur erklärt sie nach drei, vier
Partien: Zwei **offene** Karten einer Farbe am selben eigenen Platz lösen
einmal aus.

- **Feuer:** Bei der Wertung zählt der Platz ±1 (automatisch das Bessere).
- **Blatt:** eine Karte mehr auf der Hand, bis zum Ende.
- **Mond:** Du siehst eine verdeckte Karte des anderen.
- **Krähe:** Tausche eine eigene offene Karte dieses Platzes gegen eine offene
  des anderen am selben Platz.

Verdeckte Karten zählen nicht für Paare, sind dafür vor der Krähe sicher. So
wird aus „verdeckt oder offen“ eine echte Abwägung zwischen Bluff und Kombo.
Ziel für die Feinwerte: alle vier Farben zwischen 48 und 52 % im Simulator.

**Gerecht:** gleiches Deck für alle, und die KI sieht nie verdeckte Karten
(eine prüfbare Zusage). Unterschiede entstehen nur aus dem Stil.

### Kartenspiel-Persönlichkeiten

Jede Figur ist ein Satz Stellschrauben (Risiko, Bluff, Klopfen früh oder
spät, Kartenzählen, Gegner lesen) plus Tischgespräche:

- **Balduin:** klopft früh, blufft viel, spielt riskant – und verliert gern
  laut.
- **Dr. Yusuf:** vorsichtig, bleibt bei 13–14, blufft nie („Ich bluffe nicht,
  ich schätze.“).
- **Juna:** chaotisch, legt ständig verdeckt, klopft aus Spaß.
- **Alter Fischer (neuer Wanderer):** zählt Karten und liest dich – der
  stärkste Gegner, obwohl er harmlos wirkt.
- **Hannes:** behauptet, Karten zu hassen, zählt aber jede.

**Kleine „Ticks“** als freiwillige Tiefe: Beim Bluffen zeigen Figuren
manchmal ein Zeichen (Juna grinst, Balduin tippt an die Mütze) – über die
Gesichtsausdrücke der Porträts. Wer aufmerksam ist, lernt die Menschen
wirklich kennen.

### Darstellung

Die Karten liegen als große Pixelkarten auf der Oberflächen-Leinwand. Hinten
ist die Szene sichtbar: bei gutem Wetter das Feuer im Hof, bei Regen der
Kamin drinnen, dazu die Nah-Ansicht, ein eigenes ruhiges Musikstück und
Knistern, Grillen oder Regen aus den bestehenden Geräuschen.

---

## F. Bewohner und Lagerglocke – fairer Ablauf

1. **Normale Nacht:** Die Bewohner sind in Zelten und Haus oder auf ihren
   Posten (reine Unterstützung, kein Risiko).
2. **Die Glocke gibt es nur im Durchbruch** – erst wenn Schlurfer im Lager
   sind (Tor gefallen). Dann erscheint der Hinweis, zu läuten braucht einen
   langen Druck. Beim ersten Mal erklärt ein Satz, was auf dem Spiel steht –
   niemand stirbt überraschend.
3. **Wer kommt:** alle kampffähigen Erwachsenen. Kinder kämpfen nie, Knopf
   auch nicht (er bellt, und er stirbt nie). Verletzte bleiben liegen.
4. **Im Kampf** verteidigen die Bewohner Hof und Haus, nicht die Wege. Sie
   folgen einfachen Regeln: nächster Schlurfer im Lager; bei wenig Leben
   zurück zum Haus. Die Posten-Logik aus M23 ist dafür die Grundlage.
5. **Zustände:** gesund → angeschlagen → am Boden. **Am Boden heißt nicht
   tot:** Ein Ring zeigt 20 Sekunden „Lebensfaden“, eine Randmarke zeigt wo.
   Mika (E halten) oder ein anderer Bewohner hilft auf, dann humpelt die
   Person ins Haus und ist für die Nacht raus. Schlurfer suchen zuerst
   Stehende. Nur wenn niemand hilft und ein Schlurfer bleibt, läuft der Faden
   ab – dann stirbt die Person.
6. **Nach der Nacht:** Wer am Boden war, ist zwei Tage verletzt (ohne
   Fähigkeit, im Bett; Yusuf halbiert das), und wer verletzt ist, kommt beim
   nächsten Läuten nicht. **Wer gekämpft hat, ist am nächsten Tag erschöpft**
   (keine Fähigkeit, keine Morgengabe). Die Glocke kostet also immer etwas.
7. **Kein Gewinn aus der Glocke:** keine Erfahrung, keine Extra-Beute.
8. **Schwierigkeit:** *Gemütlich* – niemand stirbt (der Faden endet in
   „schwer verletzt“); *Ausgewogen* – Tod möglich wie oben; *Wild* – kürzerer
   Faden. Das Titelbild sagt es bei der Wahl.
9. **Die Entscheidung gilt:** Beim Läuten wird gespeichert, damit Neuladen die
   Wahl nicht entwertet.
10. **Ein Tod ist leise:** Die Laterne der Person erlischt, eine kurze ruhige
    Melodie, am Morgen eine stille Szene an der Erinnerungslaterne, im
    Bericht „Hannes hat es nicht geschafft.“ Kein Blut, keine Verwandlung.

Damit bleibt die Glocke ein Notfall: Sie ist selten verfügbar (nur im
Durchbruch), kostet immer (Erschöpfung) und manchmal viel (Verletzung, Tod),
und sie bringt nichts außer dem Halten des Lagers.

**Training** (Phase 5): Übung 0–3 wie in D. Je Stufe mehr Leben, mehr
Schlagkraft, drei Sekunden mehr Lebensfaden, späterer Rückzug. Drei
Einheiten je Stufe. Das Bewohnerbuch zeigt Porträt, Fähigkeit, Eigenheit,
Übung, Werkzeug und Zustand – mehr Tiefe braucht es nicht.

---

## G. Technische Architektur

**Daten (`src/data/`)**

- `residents.js` (ersetzt bzw. erweitert `survivors.js`): Personen als Daten –
  id, Name, Beruf, Fähigkeit `{ kind, werte }`, Charakterzüge, Eigenheit,
  Kartenstil, Erinnerungsstück, Ankunftsweg (`weg` | `ufer` | `boot` |
  `funk`), Aussehen (Teile aus `figureKit`, Farben), Lieblingswerkzeug,
  Dialog-Schlüssel, Stammbesetzung ja/nein, Kind ja/nein.
- `community.js`: Plätze je Bau (Zelt 1, Hütte 2, Gästezimmer 1),
  Gästeplatz, Ankunftsplan, Netzwerk-Orte und Nachrichten, Glocke
  (Lebensfaden, Erschöpfung, Genesung), Training.
- `cards.js` und `cardStyles.js`: Regelkonstanten, KI-Stile, Einsätze.

**Spielstand** (SAVE_VERSION + 1, Migration aus den festen fünf, `sanitizeState`):

```
residents: { [id]: { stage, bed, since, bond, moments[], training, tool,
                     wound: { days, severe }, tired, cards: { won, lost }, stake } }
guests:    [{ id, since, leaveDay }]
arrivals:  Plan aus dem Startwert
network:   [{ id, place, day, letters }]
memorial:  [{ id, day, item }]
bell:      { night }
cards:     { backs[], unlocked[] }
```

**Systeme**

- `core/survivors.js` → `core/community.js`: Ankunft, Gäste, Aufnehmen und
  Weitervermitteln, Plätze, Abschied, Netzwerk, Bindung, Verletzung,
  Training. Fähigkeiten über Wirkungs-Schlüssel (`repairFactor`, `regen`,
  `morningGift` …) statt `if (id === 'bert')`.
- `core/bell.js`: Glocke, Kampf-KI der Bewohner (auf `posts.js` aufbauend),
  Zustände, Lebensfaden, Rettung.
- `entities/horde.js`: Zielwahl um Bewohner erweitert, nur solange die Glocke
  läutet; Liegende werden gemieden.
- `entities/npcs.js`: sitzen, kämpfen, liegen, humpeln, trainieren;
  Figuren-Varianten aus `figureKit`.
- `core/cards.js`: reine Regel-Engine ohne three.js, in Node testbar.
  `ui/cards.js`: Tisch-Oberfläche. Neuer Modus `cards` (die Uhr steht).
  Kamera nah, Musikstück „Kartenabend“, Klänge (Mischen, Legen, Klopfen auf
  Holz).
- `ui/`: Gast-Entscheidung (Dialog), Bewohnerbuch, Glocken-Anzeige,
  Erinnerungslaterne.
- `tools/cards-sim.mjs`: Simulator wie `balance.mjs` für Regeln und
  KI-Stile. Prüfabschnitt `gemeinschaft` nur für den Kern.

---

## H. Reihenfolge

| Phase | Inhalt | Prüfen |
|---|---|---|
| 0 | Umbau ohne neue Inhalte: Überlebende datengetrieben, Speichern mit Migration – alles verhält sich wie vorher | volle Prüfung unverändert grün |
| 1 | Gäste und Plätze: 4 neue Wanderer, Ankunft über Weg, Ufer und Boot, Gästeplatz, Aufnehmen, Weitervermitteln, Verabschieden, Hütte, Bewohnerbuch, Netzwerk-Nachrichten | Kern-Prüfpunkte, dann spielst du |
| 2 | „Letzte Runde“: Regel-Engine und Simulator zuerst, dann Tisch-Oberfläche, drei Stile (Balduin, Yusuf, Juna), drinnen/draußen nach Wetter, Musik, kosmetische Belohnungen, Einsätze | Simulator-Werte, dann dein Spielgefühl |
| 3 | Bindung: gemeinsame Momente, Gesprächszeilen, Gesten, Geschenke; Posten auf reine Unterstützung umstellen | Balance-Durchlauf |
| 4 | Lagerglocke: nur im Durchbruch, Bewohner-Kampf, Lebensfaden, Verletzung, Tod je Schwierigkeit, Erinnerungslaterne | gründliche Prüfpunkte (die Glocke darf nichts kaputt machen) |
| 5 | Übungsplatz und Notfallwerkzeug | Kern-Prüfpunkte |
| 6 | Ausbau: mehr Wanderer, wiederkehrende Gäste, Pakete, Finale-Anschluss (M25), Angeln am Steg | – |

**Sofort sinnvoll:** Phase 1 und 2 – viel Spaß, wenig Risiko, das Kartenspiel
ist eigenständig testbar. **Später:** Glocke und Permadeath – ohne Bindung wäre
ein Tod bedeutungslos, deshalb erst nach den Phasen 1–3. **Weglassen oder
umdeuten:** Schusswaffen, Munition, vier Trainingswerte, Elektriker,
Nahrungswirtschaft.

---

## I. Das Bestehende schützen

1. **Spielstand:** Das Format der Überlebenden ändert sich. Alte Stände mit
   Hilde, Juna, Bert und Yusuf müssen exakt so weiterlaufen – mit Aufträgen,
   Posten und Leuchtmast-Stufen.
2. **Feste Namen** in Posten, Aufträgen, Morgengaben, Rettung, Funk und
   Leuchtfeuer, Reparaturrabatt, Dialogen, Modellen, Porträts und im
   Prüfskript (`setSurvivor`, `talkTo`, `moveIn` in mehreren Abschnitten) →
   Umbau in Phase 0 bei unveränderter Prüfung.
3. **Horde-KI:** neue Ziele nur hinter der Glocke; sonst bleibt alles gleich.
4. **Balance (M24):** Bewohner-Boni klein und nicht-kämpferisch; der
   Balance-Durchlauf rechnet mit und ohne Bewohner.
5. **Posten (M23):** Der Umbau auf reine Unterstützung ändert Balance und den
   Prüfabschnitt `gemeinsam`.
6. **Zeit:** Karten und Training dürfen die Uhr nicht laufen lassen (eigener
   Modus), sonst stoßen sie mit der Welle um 20:30 und Balduins Fahrplan
   zusammen.
7. **Durchbruch (M17):** Die Glocke darf Plündern und Umwerfen nicht
   aushebeln (keine endlosen Kämpfer, einmal je Nacht).
8. **Lichtanzahl (Regel 7):** Erinnerungslaternen und das Licht am
   Kartentisch nur als Lichtinseln und Glühmaterial.
9. **Schrift (Regel 4):** Farbsymbole als Icons, keine Emoji; alle Texte in
   `texts.js` und `dialogs.js`.
10. **Leistung:** Bis zu zehn Menschen im Lager → grobe
    Schatten-Stellvertreter, Figuren nur sichtbar, wenn nötig.
11. **Lesbarkeit:** Kosmetik darf die Silhouette und Farbe einer Turm- oder
    Barrikaden-Art nicht verwischen.
12. **Eingaben:** Modus `cards` und die Glocke in die feste
    Eingabereihenfolge einsortieren, ohne Doppelbelegung (G ist belegt).
13. **Einstieg:** Die Tage 1–6 bleiben die Einführung der Stammbesetzung,
    ohne Entscheidungsdruck.
14. **Ton:** kein Horror (keine Verwandlung Gefallener, kein Blut), Tod nur
    nach einer bewussten Entscheidung.
