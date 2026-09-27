# Mira – m6-r1

## Was Spaß gemacht hat

- Der Einstieg ist zum Dahinschmelzen: „Wärme im Gesicht, Kälte im Rücken. So
  muss ein Lagerfeuer sein.“ und „Der kleine Ofen bullert vor sich hin. Das
  beste Geräusch der Welt.“ – solche Zeilen holen mich sofort in die Stimmung.
  Auch der trockene Humor sitzt: das Straßenschild „Freibad Stillwald –
  vorübergehend geschlossen“, worauf Mika nur trocken „Vorübergehend. Na
  klar.“ murmelt.
- Oma Hilde und Juna kennenzulernen war das Highlight der Runde. Beide haben
  eigene Porträts, eigene Farben, eigene Stimme im Text – siehe Checkliste
  unten, das hat mich wirklich gefreut.
- Einrichten fühlt sich genau richtig an: Bild aufstellen, sofort eine
  Meldung „Gemütlichkeit 1/10“, dann Teekanne, Wimpelkette, Lichterkette –
  bei jedem Stück ein kleiner Belohnungsmoment, und die Lichterkette leuchtet
  abends tatsächlich am Dach! Am nächsten Morgen kam dann „Ausgeschlafen
  (Gemütlichkeit 5): +5 Erfahrung, bis Mittag schneller unterwegs.“ – schön,
  dass sich das gemütliche Zuhause spielerisch auszahlt, nicht nur optisch.
- Der Funkturm-Reveal: Am allerersten Morgen steht Mika schon einmal kurz vor
  der Turmruine und sagt leise „Wenn der wieder stünde – mit einem Licht ganz
  oben – man würde e[s sehen]…“ – eine schöne, leise Vorahnung. Als Juna dann
  auftaucht und sagt „Ein Leuchtfeuer... dann sieht man uns über den ganzen
  Wald“, war ich sofort dabei. Ich will unbedingt wissen, wie es weitergeht.
- Das Silhouetten-System bei Nacht funktioniert genau wie in DESIGN.md
  beschrieben: Ein Schlurfer hinter einem Busch erscheint als lavendelfarbener
  gerasterter Umriss – sehr hübsch anzusehen und tatsächlich nützlich.
- Der sanfte Rückzug bei niedrigem Leben („Gerade noch ins Haus geschafft.
  Durchatmen – die Türme halten.“) hat mich in einer brenzligen Nacht
  gerettet, ohne dass es sich nach Bestrafung angefühlt hat.
- Perk-Wahl-Bildschirm ist hübsch gestaltet (Karten mit Icon, Text, klarer
  Hinweis „1 2 3 oder A/D und E“).

## Wo ich hängen blieb oder mich gelangweilt habe

- Sehr oft habe ich das falsche Objekt angesprochen, weil sich
  Interaktionsradien überlappen: Neben dem Hackklotz stehend wollte ich mit
  Knopf reden, bekam aber immer wieder „Der Hackklotz. Die Axt habe ich schon
  eingesteckt.“ Später wollte ich Oma Hilde ansprechen, landete aber
  mehrfach bei der benachbarten Straßenlaterne. Das hat mich einige Minuten
  gekostet und aus der Stimmung gerissen.
- Kurz im eigenen Haus „feststeckt“: An einem kleinen Beistelltisch mit Lampe
  und Gläsern kam ich in eine Ecke, aus der weder „nach links“ noch „nach
  unten“ herausführte – erst „nach oben, dann links, dann unten“ hat
  funktioniert. Kein Beinbruch, aber unnötig fummelig für so einen kleinen
  Innenraum.
- Ressourcen für ein Schlafzelt (8 Holz, 3 Stoff) zusammenzubekommen, hat mir
  die ganze Runde nicht gereicht, weil markierte Bäume nur alle zwei Tage
  nachwachsen und ich gleichzeitig Verteidigung und Einrichtungsgegenstände
  finanzieren wollte. Ich hätte Oma Hilde und Juna gerne einen echten
  Schlafplatz gegeben, aber immer kam der Abend dazwischen.
- Die Nächte waren mit nur einem Bolzenwerfer (mein einziger Turm) drei von
  vier Malen zu viel – das Zuhause ist fast jede Nacht gefallen, einmal auf
  −3/300. Das ist nicht „falsch“ (Verlieren kostet ja nur Material), aber für
  mein gemütliches Tempo – viel Zeit mit Reden, Einrichten, Zusehen – hat es
  sich nach der ersten Nacht eher zermürbend als spannend angefühlt.

## Was unklar war

- Ob Knopf (der Hund) überhaupt eine eigene Ansprache/Dialogzeile hat. Er
  taucht in der Überlebenden-Liste auf, aber ich konnte nie etwas anderes als
  die Flavour-Texte benachbarter Gegenstände auslösen. Laut Kurzbeschreibung
  ist er wohl bewusst passiv (bellt, findet Loot) – aber sicher bin ich mir
  nicht.
- Warum das Zuhause an einem ruhigen Erkundungstag (Tag 1) unbeobachtet von
  300 auf 225 fiel, ohne dass mir ein auffälliger Alarm aufgefallen wäre,
  bevor ich zurückschaute – vielleicht kam die Meldung, während ich weit weg
  war und nicht hinsah.

## Fehler

### F1: Vorausgewählte Antwort beim Lagerfeuer/Sessel wechselt zwischen Besuchen (Schwere: Spielfluss)
- Schritte: Tagsüber mehrfach mit dem Lagerfeuer bzw. dem Ohrensessel
  sprechen („Ins Feuer schauen“ / Hinsetzen), Text abwarten, mit E bestätigen.
- Erwartet: Laut CLAUDE.md ist bei Rückfragen immer die harmlose Antwort
  vorausgewählt (hier: „Weitermachen“).
- Passiert: Beim ersten Besuch war „> Weitermachen“ vorausgewählt, bei einem
  späteren Besuch stand der Cursor stattdessen auf „> Bis zum Abend ausruhen
  (18:30)“. Wer schnell mit E wegklickt, springt so versehentlich Stunden
  nach vorn – mir ist das tatsächlich einmal passiert.
- Screenshot: kein eigener (siehe allgemeine Dialogansicht in
  `04-einrichten-gemuetlichkeit.png`, gleiche UI-Familie).

### F2: Interaktion (E) bevorzugt oft ein Objekt statt die danebenstehende Person (Schwere: Feinschliff)
- Schritte: Neben einem Überlebenden stehen, der direkt neben einem
  Hackklotz/einer Straßenlaterne steht, E drücken.
- Erwartet: Die Person zum Ansprechen sollte Vorrang vor einem stummen
  Deko-Objekt haben, oder zumindest deutlich einfacher zu treffen sein.
- Passiert: Mehrfach hat E das Objekt-Flavourtext ausgelöst statt „Ansprechen“
  bei der Person; ich musste mich jeweils 2–3 Schritte umpositionieren.
- Screenshot: `02-oma-hilde.png` zeigt die Szene, nachdem es endlich geklappt
  hat.

## Checkliste

- Tag ruhig genug zum Bauen? – Ja, tagsüber nur vereinzelte, träge Schlurfer;
  genug Ruhe zum Sammeln, Bauen, Reden. Einmal hat ein unbeobachteter
  Tagesangriff das Zuhause aber spürbar (ein Viertel) angeknabbert, während
  ich am anderen Ende der Lichtung unterwegs war.
- Nächte mit Action? – Sehr sogar, siehe oben: mit nur einem Turm kam ich
  drei von vier Nächten nicht durch, ohne dass das Zuhause fiel.
- Aufrüsten lohnend? – Nicht mein Schwerpunkt diese Runde, aber Holz/Stein an
  der Werkbank zu Schrott zu verwerten hat spürbar geholfen, überhaupt einen
  zweiten Turm anzudenken.
- Schwierigkeit gleichmäßig und fair? – Kann ich nicht sauber beurteilen, da
  ich bewusst kaum in Verteidigung investiert habe. Auffällig: Das Zuhause
  ist in 3 von 4 Nächten gefallen, auch mit einem Turm.
- Look passt zu DESIGN.md? – Ja, sehr. Warme Innenraumfarben, kühles
  Nachtblau mit warmen Lichtinseln (Feuer, Fenster, jetzt auch die eigene
  Lichterkette am Dach), Silhouetten in Lavendel für verdeckte Schlurfer
  genau wie beschrieben, saubere Pixelkanten, keine Unschärfe.
- Erkennt man, was was ist? – Ja: Mika (orange Mütze, grüne Jacke), Oma Hilde
  (blaue Postmütze, dunkle Jacke), Juna (dunkler Kopfhörer-Look), Schlurfer
  (grünlich mit leuchtenden Augen) sind auf Anhieb unterscheidbar.
- Sind die Überlebenden sympathisch und gut zu unterscheiden? – Bei den
  beiden, die ich getroffen habe (Oma Hilde, Juna): ja, eindeutig. Aussehen,
  Porträt und Tonfall passen zur Beschreibung und unterscheiden sich klar
  voneinander und von Mika. Knopf ist knuffig anzusehen, aber ich fand keine
  eigene Ansprache für ihn (siehe „Was unklar war“). Baumarkt-Bert und
  Dr. Yusuf sind bis Tag 5 morgens nicht aufgetaucht – noch nicht im Spiel
  für mich zu beurteilen.
- Versteht man, was sie wollen und was sie bringen? – Ja, sehr klar. Oma
  Hilde bittet direkt um „einen trockenen Schlafplatz“, und Mikas Gedanke
  danach fasst es nochmal zusammen („Wer bleiben will, braucht einen
  Schlafplatz. Ein Zelt aus der Bauleiste.“). Juna erklärt sofort ihren Plan
  und was zuerst gebraucht wird (Schrott, Holz für Leiter und Plattform).
  Keine Verwirrung, keine Rätselraterei.
- Fühlt sich das Einrichten lohnend an? – Ja. Jedes Möbelstück gibt sofort
  sichtbares Feedback (Meldung + Gemütlichkeits-Zähler + optische Wirkung),
  und der Effekt (Erfahrung, ab 5 spürbar schneller unterwegs) zeigt sich am
  nächsten Morgen im Bericht. Einziger Wermutstropfen: teurere Objekte
  (allen voran das Schlafzelt für Gäste) konkurrieren früh im Spiel stark mit
  Materialien für Türme/Reparatur.
- Trägt die Geschichte um den Funkturm? – Auf jeden Fall. Die leise
  Vorahnung am ersten Morgen und Junas Ankunft mit klarer Vision („Leuchtfeuer,
  man sieht uns über den ganzen Wald“) haben bei mir echte Vorfreude
  geweckt. Ich will unbedingt wissen, wie der Turm wieder aufgebaut wird und
  was er dann bewirkt.

## Gesamturteil (1–10) und wichtigster Wunsch

**8/10.** Die neuen Inhalte – Überlebende, Einrichten, Funkturm-Geschichte –
sind genau das, was dieses Spiel so gemütlich macht, und die Texte treffen
den Ton perfekt. Mein wichtigster Wunsch: Interaktionen mit Personen sollten
zuverlässig Vorrang vor benachbarten Deko-Objekten haben (F2), und die
vorausgewählte Antwort bei Rückfragen sollte wirklich immer stabil die
harmlose sein (F1) – beides hat mich unnötig oft aus der schönen Stimmung
gerissen.
