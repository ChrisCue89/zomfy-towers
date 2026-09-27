# Kira – m6-r1

## Was Spaß gemacht hat

- Der Funkturm als Ziel: erst die stumme Ruine sehen, dann zufällig das Radio
  im Haus finden, das ein Rauschen mit „Radio Stillwald“ auffängt, und kurz
  danach Juna kennenlernen, die genau dieses Signal gesendet hat – das war
  ein richtiger „Aha“-Moment und motiviert sofort, Schrott für die
  Turm-Ausbaustufen zu sammeln.
- Knopf, der Streuner-Hund, der sich einfach anschleicht und nur „Wuff!“
  sagt – knuffig, klar als Tier erkennbar, kein falscher Ernst.
- Die Wiederholbarkeit von Kleinigkeiten hat Charakter: der Briefkasten
  („Der Briefkasten ist leer. Noch.“, später „Immer noch leer. Aber
  nachsehen macht trotzdem Spaß.“) und das stillgelegte Freibad-Schild
  („Vorübergehend. Na klar.“) – genau der trockene Humor aus DESIGN.md.
- Dass „Nacht verloren“ nie hart bestraft: Material weg, Zuhause auf einen
  Bruchteil geflickt, aber Spielstand und Fortschritt bleiben – genau wie
  versprochen, inklusive der hilfreichen Zeile „Schrott dafür gibt es am
  Waldrand“ direkt im Morgenbericht.
- Die Kostensteigerung bei mehrfachen Türmen derselben Art („Jeder weitere
  dieser Art kostet 2 Schrott mehr“) – ein feiner Balance-Kniff.
- Reparieren ist während einer Welle gesperrt („Erst die Welle abwehren –
  dann flicken“) und Schlafen ist gesperrt, solange die Horde draußen ist
  („Schlafen? Nicht, solange die Horde draußen ist.“) – beide Sperren mit
  eigenem Text, nicht nur stumm ignoriert.

## Wo ich hängen blieb oder mich gelangweilt habe

- Das erste Tutorial-Ziel „Durchsuche Schrott, baue einen Bolzenwerfer“
  nennt keinen Ort. Ich bin fast 20 Minuten Spielzeit durch die ganze
  Lichtung gelaufen, bis ich den Autowrack am Waldrand als Schrott-Quelle
  gefunden habe. Kein Wegpunkt, keine Randmarke hat dorthin gezeigt.
- Drinnen im Haus bin ich mehrfach in eine Ecke hinter Ofen/Regal geraten,
  aus der WASD nicht mehr herausführte (siehe F1) – frustrierend, bis ich
  zufällig die Ausweichrolle probiert habe.
- Nächte, in denen ich nur `wait` habe laufen lassen (um Zeit zu sparen),
  liefen praktisch von selbst gegen mich: Ohne aktives Zuschlagen sinkt die
  Standfestigkeit sehr schnell auf 0. Das ist wahrscheinlich Absicht, aber
  es fühlte sich seltsam an, dass „einfach nichts tun“ in Sekunden das
  Zuhause kostet, während ein einzelner Turm allein spürbar mehr aushält.

## Was unklar war

- Was genau „Gemütlichkeit“ (im Statusfeld sichtbar) bewirkt, blieb mir
  komplett offen: Der Wert stand die ganze Runde über bei 0 – auch nachdem
  ich Werkbank, Sitzbank, Laternenpfahl und Schlafzelt gebaut und Juna
  einquartiert hatte. Vielleicht hängt er an der Hütten-Ausbaustufe oder an
  Gegenständen, die ich mir nicht leisten konnte (z. B. das „Bild“), aber
  ohne jede Reaktion wirkt die Anzeige wie toter Text.
- Ob Knopf tatsächlich „auf seine Art hilft“ (wie in der Rundenbeschreibung
  angekündigt) oder nur Dekoration ist, konnte ich nicht sicher sagen – er
  lässt sich streicheln, mehr Interaktion gab es nicht, und einen Schlafplatz
  wollte er nicht (kein Angebot dafür erschienen).
- Der Doppel-Druck bei „Ansprechen“/„Ansehen“: oft musste ich E zweimal
  drücken, einmal nur für den Hinweis, einmal für den echten Dialogstart.
  Kann an meiner kurzen Tastendauer liegen, wirkte aber inkonsistent zu
  anderen Interaktionen, die sofort reagierten.

## Fehler

### F1: Figur bleibt hinter Ofen/Regal im Haus hängen, nur Ausweichrolle befreit sie (Schwere: Spielfluss)
- Schritte: Ins Haus gehen (z. B. nach dem Morgenbericht, wenn man
  automatisch drinnen aufwacht), zum Ofen/Regal auf der Ostseite der Küche
  laufen (Weltposition ca. x=1.9–2.1, z=−2.9 bis −4.9).
- Erwartet: Mit W/A/S/D sollte man aus jeder erreichbaren Ecke wieder
  herausfinden.
- Passiert: Die Figur war in einem ca. 0,2 × 1,5 m schmalen Streifen
  gefangen – W/A/S/D bewegten sie jeweils nur bis an eine unsichtbare Wand,
  nie hindurch. Ein Neuladen (`reload`) speicherte die Position mit ab, man
  wacht also genauso gefangen wieder auf. Einzig die Ausweichrolle
  (Leertaste) ließ die Figur ein Stück durch die Geometrie „hüpfen“ und
  irgendwann heraus. Aus derselben Enge heraus war die Figur auf
  Screenshots teils komplett unsichtbar (kein Umriss, keine Silhouette wie
  sonst bei Verdeckung) – vermutlich, weil die Kamera nie kippt und ein
  hohes Möbelstück sie an dieser Stelle direkt verdeckt, ohne dass die
  Umriss-Regel aus DESIGN.md 3.6 dafür greift.
- Screenshot: kira/03-unsichtbar-hinter-ofen.png
- Ohne das Wissen um die Ausweichrolle (die im Kampf, nicht in
  Möbel-Situationen naheliegt) hätte ich mich hier für „richtig
  festgesetzt“ gehalten.

### F2: Standfestigkeit zeigt kurzzeitig einen negativen Wert (Schwere: Feinschliff)
- Schritte: Eine Nacht ohne Gegenwehr verlieren lassen (Zuhause fällt auf 0
  und darunter), sofort danach `look` abfragen.
- Erwartet: Anzeige bleibt bei 0/300, danach automatische Notreparatur.
- Passiert: Einmal zeigte `look` kurz „zuhause: -1/300“, bevor der
  Morgenbericht die geflickten 75/300 auswies. Rein kosmetisch, aber ein
  negativer Balkenwert sollte nie sichtbar werden.

### F3: Zelt lässt sich ohne jede Warnung abreißen, während jemand darin wohnt (Schwere: Feinschliff – Vorschlag)
- Schritte: Juna (oder eine andere Überlebende) in ein Schlafzelt
  einziehen lassen, danach das Zelt anklicken → „Abreißen“ → bestätigen.
- Erwartet/Passiert: Kein Hinweis wie „Hier wohnt jemand“ – nur die übliche
  „Nochmal drücken: abreißen“-Bestätigung, exakt wie bei einem leeren
  Zelt. Das Ergebnis danach ist aber vorbildlich gelöst (siehe unten), nur
  die fehlende Vorwarnung fände ich als Feinschliff wünschenswert, damit
  man das nicht aus Versehen tut.
- Screenshot: kira/05-zelt-abgerissen-bewohnt.png (Gedankenblase „Juna hat
  kein Zelt mehr und schläft wieder am Feuer.“, Rohstoffe komplett
  zurückerstattet, Ziel sprang zurück auf die allgemeine
  Nacht-Überstehen-Aufgabe – nach erneutem Zelt-Bau und Angebot war Juna
  sofort wieder eingezogen und das Funkturm-Ziel kehrte zurück. Kein
  Duplikat, kein Softlock, keine Konsolenmeldung.)

Zusätzlich getestet, ohne Fehler gefunden: Reload mitten in Junas
Dialog (Dialog schloss sich sauber, „Willkommen zurück!“, Position und
Fortschritt blieben erhalten); Zelt in vollem Möbel-Cluster platzieren
(korrekt mit rotem Geistermodell und „Kein Platz“ abgelehnt); Schlafen
während laufender Welle (sauber mit eigenem Text gesperrt); Fenstergrößen
1280×720, 800×500 und 500×800 Hochkant (HUD bleibt lesbar und
überschneidungsfrei, siehe kira/06-fenstergroesse-hochkant.png); Konsole
nach jeder größeren Aktion abgefragt – nie eine Meldung, weder Fehler noch
Warnung.

## Checkliste

- Tag ruhig genug zum Bauen? – Ja, tagsüber ist Zeit für Wege, Sammeln und
  Bauen; die gelegentlichen einzelnen Schlurfer am Tag sind eher lästig als
  bedrohlich, solange man hinschaut – lässt man die Zeit aber unbeobachtet
  laufen, frisst so ein Einzelgänger spürbar Lebens- und Zuhause-Punkte.
- Nächte mit Action? – Ja, ab Welle 1 wird es hektisch; mit nur einem Turm
  und Klicks aus der Ferne war ich den Wellen aber unterlegen (Nacht 1–3
  alle „verloren“, siehe oben).
- Aufrüsten lohnend? – Kann ich für dieses Milestone-Thema nicht
  abschließend beurteilen (nicht meine Perspektive), aber die
  Kostensteigerung pro zusätzlichem Turm derselben Art ist ein schöner,
  spürbarer Kniff.
- Schwierigkeit gleichmäßig und fair? – Für die neuen Systeme selbst: ja,
  nichts hat sich unfair angefühlt, nur konsequent (kein Turm ⇒ Horde erreicht
  Haus, das wird auch klar kommuniziert).
- Look passt zu DESIGN.md? – Ja: warmes Licht am Haus/Feuer/Laterne gegen
  kühles Blau der Nacht, Pixelkanten sauber, Dithering-Durchsicht an
  Büschen und an Schlurfern direkt vor der Kamera sichtbar (wird
  halbtransparent, damit man die eigene Figur nicht verliert).
- Erkennt man, was was ist (Figur, Quellen, Bauten, später Schlurfer,
  Türme, Loot)? – Ja, durchweg gut unterscheidbar; einzige Ausnahme ist
  F1 (Figur hinter hohem Innenraum-Möbel unsichtbar statt als Umriss).
- Sind die Überlebenden sympathisch und gut zu unterscheiden? – Ja. Knopf
  (Hund, „Wuff!“) und Juna (Mensch mit Funkgerät-Vorgeschichte, eigenes
  Porträt, eigene Stimme im Dialog) sind auf Anhieb unterscheidbar und
  liebevoll geschrieben.
- Versteht man, was sie wollen und was sie bringen? – Bei Juna sehr klar
  (sie will den Funkturm reparieren, nennt konkrete Materialkosten, das
  Ziel in der Kopfzeile führt direkt zum „Einrichten“-Reiter). Bei Knopf
  unklar (siehe „Was unklar war“).
- Fühlt sich das Einrichten lohnend an? – Teils. Das Schlafzelt fühlt sich
  lohnend an, weil es sichtbar eine Überlebende bindet und ein Ziel
  freischaltet. Werkbank/Sitzbank/Laternenpfahl/Flachsbeet fühlten sich
  eher wie Zuhause-Ausbau (guter Nutzen: Werkzeugbau, Nachtlicht) an denn
  wie „Einrichten“ fürs Gefühl – dafür fehlte mir eine sichtbare Wirkung
  (siehe Gemütlichkeit).
- Trägt die Geschichte um den Funkturm? – Ja, für den Rundenstart schon
  überraschend stark: Ruine ansehen → Radio findet ihr Signal → Gespräch
  mit der Absenderin selbst → klares, bepreistes Etappenziel. Macht
  neugierig auf die nächsten zwei Ausbaustufen.

## Gesamturteil (1–10) und wichtigster Wunsch

**8/10.** Die neuen Systeme wirken schon jetzt herzlich und robust (Reload,
Fenstergrößen, „Nacht verloren“, Zelt-Abriss bei Bewohnung – überall kein
Absturz, keine Konsolenmeldung, keine verlorenen Spielstände). Mein
wichtigster Wunsch: den Innenraum-Bewegungsfehler (F1) beheben, bevor mehr
Möbel/Überlebende dazukommen – in einem noch volleren Haus wird die
Ecke hinter dem Ofen sonst schnell zur echten Falle.
