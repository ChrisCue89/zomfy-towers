# Jonas – m3-r1

Neues Spiel, alles weggeklickt, was nach Text aussah. **Zwei Nächte überlebt**
(Nacht 1: 18 Schlurfer, Nacht 2: 21 Schlurfer, das Zuhause hat nachts nie
Schaden bekommen). Am Ende stand ich an Tag 3 mit 4 Bolzenwerfern (zwei auf
Stufe 2), 2 Kürbiskatapulten, 1 Rasensprenger und 3 Barrikaden da. Gebraucht
habe ich etwa 230 Brückenbefehle, weil ich nachts viel gesucht habe.
Konsole war die ganze Zeit leer.

## Was Spaß gemacht hat

- **Das Aufleuchten der Bauleiste.** Nach dem zweiten Schrotthaufen werden die
  Turmsymbole bunt und oben steht „Bolzenwerfer ist jetzt bezahlbar“. Ich habe
  sofort Q gedrückt. Geisterbild mit Reichweitenkreis, ein Klick, fertig.
  Genau so muss das sein.
- „Fehlt: 7 Schrott“, wenn ich zu früh Q drücke: Man weiß sofort, was fehlt.
- **Ansagen vor und in der Nacht:** „Bald kommt die Horde – um 20:30!“, dann das
  große „Welle 1/3“ und oben in der Mitte „Nacht 1 · Welle 1/3“ mit der Leiste
  vom Zuhause. Dass jetzt was passiert, merkt man sofort.
- „Bis zum Abend ausruhen“ im Ohrensessel. Ohne das hätte ich mich am ersten
  Vormittag zu Tode gelangweilt.
- Kloppen mit Schadenszahlen („12“) und dann kommen „+1“, „+2“ Schrott zu mir
  geflogen. Wenn es klappt, fühlt sich das gut an.
- Turm anklicken, Q, „Bolzenwerfer 2 ausgebaut“ – super einfach. Danach sieht
  man schon die nächsten Stufen (Scharfschütze / Repetierer). Das macht neugierig.
- Der Bericht am Morgen („Besiegte Schlurfer: 21, Eingesammelt: 27“) ist ein
  schöner Abschluss, auch wenn ich ihn nur kurz angeschaut habe.
- Ein fliegender Kürbis vom Katapult und der Wasserbogen vom Rasensprenger
  sahen cool aus, wenn ich sie mal gesehen habe.

## Wo ich hängen blieb oder mich gelangweilt habe

- **Erster Vormittag:** Nach dem ersten Turm hatte ich 2 Schrott. Holz und
  Stein an der Werkbank im Verhältnis 3 : 1 zu Schrott machen fühlt sich zäh
  an. Bis zum zweiten Turm war es ewig Bäume hacken, Steine klopfen, E halten.
- **Nachts die Welle suchen:** Bei Welle 2 (beide Nächte) habe ich die Ansage
  verpasst, weil sie nach ein paar Sekunden weg ist. Dann bin ich einmal ums
  ganze Haus, zur Straße, nach Osten und zurück gerannt, bis die Schlurfer
  von allein an der Haustür auftauchten. Das war die langweiligste Phase.
- **Im Dunkeln kämpfen:** Ich sehe meistens nur leuchtende Augen. Wo meine
  Türme stehen, was sie gerade tun und wo die Beute liegt, sehe ich nachts
  kaum.
- An den eigenen Bauten bleibe ich ständig hängen (Werkbank, Turm, Sessel,
  Autowrack auf der Straße). Beim geraden Rennen nervt das, ist aber kein
  Fehler.
- Zwischen den Wellen passiert 15–20 Spielminuten lang nichts. Weiß man nicht,
  woher die nächste kommt, steht man nur rum.

## Was unklar war

- **Woher die Welle kommt**, steht nur als Text („aus dem Nordwesten!“). Es gibt
  keinen Pfeil am Bildschirmrand, obwohl die Schlurfer außerhalb vom Bild schon
  unterwegs sind.
- Was die Barrikade wirklich macht („Lenkt die Horde um“). Ich habe drei gebaut
  und keinen Unterschied gemerkt. Das Ziel wurde abgehakt, mehr nicht.
- Ob die Türme überhaupt schießen. Gemerkt habe ich es meistens nur am Bericht
  (18 besiegt, obwohl ich selbst vielleicht 8 erwischt habe). Bolzen habe ich
  nie gesehen.
- Wo es **Zahnräder** gibt. Die braucht man für die Spezialisierung, gefunden
  habe ich keins.
- Der gepunktete Kreis beim Platzieren ist wohl die Reichweite. Das habe ich
  mir so gedacht, es steht aber nirgends.
- Welche Schlurfer-Arten es gibt. Ich habe gelbe, grüne und türkise Augen und
  einmal einen mit rosa/orangem Hut gesehen, aber im Dunkeln nicht erkannt,
  was sie anders machen.
- Für den Nahkampf muss man direkt am Schlurfer kleben. Aus 1,5–2 m passiert
  beim Klick gar nichts, man sieht auch keinen Schwung. Da dachte ich erst,
  Klicken geht kaputt.

## Fehler

### F1: Werkbank – erster E-Druck nach Auswahl mit W/S geht ins Leere (Schwere: Spielfluss)
- Schritte: Werkbank mit E öffnen, S auf „Holz zu Schrott verwerten“, E
  drücken (100 ms oder 300 ms danach).
- Erwartet: 3 Holz werden zu 1 Schrott. / Passiert: Nichts. Erst der zweite
  E-Druck verwertet. Viermal nachgestellt, auch mit „Stein zu Schrott“. Wenn
  man die Auswahl nicht ändert, zählt jeder E-Druck, auch dreimal in 300 ms.
  Ich habe mich dadurch zweimal verzählt und zu viel oder zu wenig verwertet.
- Screenshot: –

### F2: Nachts sieht man fast nichts (Schlurfer, Türme, Beute) (Schwere: Spielfluss)
- Schritte: Nacht 1, Welle 1 im Nordwesten mit Laterne (F) entgegenlaufen.
- Erwartet: Man sieht Schlurfer als Figuren und Türme und Beute als eigene
  Formen. / Passiert: Von den Schlurfern sieht man nur die Augenpunkte. Der
  Körper taucht erst im kleinen Laternenkreis auf. Meine Türme sind dunkle
  Klötze, die Beute am Boden sehe ich gar nicht. Laut Ablesen lagen nach den
  Wellen noch 1–6 Beutestücke herum, die ich nie gefunden habe.
- Screenshot: jonas/nacht-nur-augen.png

### F3: Richtung der Welle nur als kurzer Text, kein Randpfeil (Schwere: Spielfluss)
- Schritte: Nacht 1 und 2, nach Welle 1 etwa 10 s warten, bis Welle 2 startet.
- Erwartet: Ein Hinweis am Bildschirmrand, der zeigt, wo die Schlurfer sind. /
  Passiert: Die Meldung „Welle 2 von 3 – aus dem …“ ist verschwunden, bevor ich
  hinschaue. Oben steht nur „Welle 2/3“. Ich bin minutenlang in die falsche
  Richtung gelaufen (Osten, Straße), die Schlurfer kamen aus dem Westen.
- Screenshot: jonas/welle-ansage.png (so sieht es aus, wenn man die Ansage
  erwischt)

### F4: Dialog „Ich sollte bald ins Bett“ mitten in Welle 3 (Schwere: Spielfluss)
- Schritte: Nacht 1, 23:30 Uhr, Welle 3 läuft, ich stehe neben einem Schlurfer.
- Erwartet: Höchstens eine Gedankenblase, die das Spiel nicht anhält. /
  Passiert: Ein Dialogfenster mit Porträt geht auf und hält das Spiel an.
  Mitten im Kampf, Schlurfer direkt neben mir.
- Screenshot: jonas/dialog-mitten-in-welle.png

### F5: An der Nordkante verschwindet die Figur unter der oberen Leiste (Schwere: Spielfluss)
- Schritte: Nacht 2, Welle 3 aus dem Nordwesten, dem letzten Schlurfer bis an
  den oberen Kartenrand nachlaufen.
- Erwartet: Die Figur bleibt sichtbar. / Passiert: Die Kamera bleibt am
  Kartenrand stehen, die Figur rutscht nach ganz oben unter „Nacht 2 · Welle
  3/3“ und das Zielfeld. Ich habe 40 Leben verloren, ohne zu sehen, von wem.
- Screenshot: jonas/figur-unter-hud.png

### F6: Angriffsklick wählt den Turm aus, danach heißt R „Abreißen“ (Schwere: Spielfluss)
- Schritte: Nacht 2, Welle 1: auf einen Schlurfer klicken, der vor meinem
  Rasensprenger steht.
- Erwartet: Nur zuschlagen. / Passiert: Der Rasensprenger wird ausgewählt, die
  Bauleiste zeigt „Rasensprenger 1: Q Stufe 2, R Abreißen“. Ich wollte mit R ein
  Katapult bauen und bekam „Nochmal drücken: abreißen“. Wer R zweimal drückt
  (so wie ich normalerweise), reißt mitten im Kampf seinen Turm ab.
- Screenshot: jonas/angriff-waehlt-turm.png

### F7: Durchsuchen startet beim ersten Mal einen Dialog statt zu suchen (Schwere: Feinschliff)
- Schritte: Am Autowrack „E Durchsuchen“ halten.
- Erwartet: Fortschritt, dann Schrott. / Passiert: Zwei Seiten Text über das
  Auto. Danach muss man E noch mal halten.

### F8: Aufsammeln bricht ab, wenn man gleich weiterläuft (Schwere: Feinschliff)
- Schritte: Bei „E Aufsammeln“ an einem Steinhaufen E tippen und nach etwa
  0,3 s weiterlaufen.
- Erwartet: Steine sind eingesammelt. / Passiert: Nichts eingesammelt, der
  Haufen liegt noch da. Mit 0,5 s Stehenbleiben klappt es.

### F9: E am Sessel direkt nach dem Schließen des Dialogs ohne Wirkung (Schwere: Feinschliff)
- Schritte: Sessel mit E, Dialog mit Leertaste wegdrücken (landet auf
  „Weitermachen“), gleich wieder E drücken.
- Erwartet: Der Sessel-Dialog kommt wieder. / Passiert: Beim ersten E passiert
  nichts, erst beim zweiten. Nur einmal beobachtet.

### F10: Bericht sagt „Das Zuhause ist unversehrt“, die Leiste steht auf 276/300 (Schwere: Feinschliff)
- Schritte: An Tag 1 abends haut ein einzelner Schlurfer vor der Horde aufs
  Haus (−24). Nacht überstehen, schlafen.
- Erwartet: Der Text passt zur Leiste. / Passiert: Im Bericht steht
  „unversehrt“, oben steht weiter 276/300.

## Checkliste

- **Tag ruhig genug zum Bauen?** – Ja, eher zu ruhig. Einmal kam abends ein
  einzelner Schlurfer und hat das Haus angekratzt, sonst nichts los. Mit
  „Bis zum Abend ausruhen“ passt es.
- **Nächte mit Action?** – Ja, drei Wellen pro Nacht mit etwa 18–21 Schlurfern.
  Die Action wird aber vom Suchen im Dunkeln ausgebremst (F2, F3).
- **Aufrüsten lohnend?** – Kann ich schwer sagen. Stufe 2 kostet 10 Schrott,
  einen Unterschied habe ich weder gesehen noch gemerkt. Die Spezialisierung
  braucht Zahnräder, die ich nie hatte. Sammelradius habe ich ganz am Ende
  gekauft und nicht mehr ausprobiert.
- **Schwierigkeit gleichmäßig und fair?** – Fair ja, aber bisher zu leicht. Das
  Zuhause hat in beiden Nächten nichts abbekommen. Nacht 2 war kaum stärker
  als Nacht 1 (21 statt 18). Gefährlich wurde es nur für mich im Nahkampf
  (runter auf 60/100).
- **Look passt zu DESIGN.md?** – Pixel-Look, warme Fenster, Lagerfeuer und
  Laternenkreis gegen die dunkle Nacht: ja, sieht stimmungsvoll aus. Die Nacht
  ist aber so dunkel, dass „Lesbarkeit vor Stimmung“ nicht mehr stimmt.
- **Erkennt man, was was ist (Figur, Quellen, Bauten, Schlurfer-Arten, Türme,
  Loot)?** – Tagsüber ja: Bolzenwerfer (Armbrust auf Pfahl mit Steinfuß),
  blauer Rasensprenger, kleine Palisade als Barrikade, Schlurfer bläulich mit
  leuchtenden Augen. Nachts nein: Türme sind dunkle Klötze, Schlurfer nur
  Augenpaare, Beute unsichtbar. Die Arten unterscheide ich höchstens an der
  Augenfarbe.
- **Macht Einsammeln Spaß?** – Wenn „+1“, „+2“ beim Kloppen reinfliegen, ja.
  Aber der Radius ist winzig und im Dunkeln sehe ich nicht, wo noch was liegt.
  Dass Schlurfer überhaupt was fallen lassen, habe ich erst an der
  Schrottzahl gemerkt.
- **Bauleiste ohne Erklärung verständlich?** – Ja. Die Buchstaben stehen auf
  den Kacheln, darunter der Preis. Ausgegraut, dann bunt, dazu Geisterbild und
  Tooltip. Tab für die Reiter habe ich durch Rumdrücken gefunden. Gefährlich
  ist nur, dass Q/R/T nach einer Auswahl etwas anderes bedeuten (F6).
- **Motiviert das Aufleuchten?** – Ja, klar das Beste an der Bauleiste. Ich habe
  jedes Mal sofort gebaut, wenn etwas bunt wurde.
- **Merkst du ohne Text, dass eine Horde kommt, woher sie kommt und was du
  dagegen tun kannst?** – *Dass:* ja (Riesen-„Welle 1/3“, Leiste oben,
  Dunkelheit). *Woher:* nur, wenn man den Text in dem Moment liest, sonst nicht
  (F3). *Was dagegen:* Türme ja, weil die Bauleiste immer sichtbar ist.
  Barrikaden nein.
- **Findest du die Türme, kannst du sie setzen und ausbauen? Sammelst du die
  Beute ein?** – Türme finden und setzen: sofort. Ausbauen: Turm anklicken oder
  mit E auswählen, Q, geht. Beute: teilweise (siehe oben).
- **Ist die Nacht spannend oder frustrierend?** – Beides. Die erste Welle ist
  spannend, danach nerven Suchen, Dunkelheit und das Warten zwischen den
  Wellen. Richtig eng wurde es nie.
- **Tastendrücke ins Leere oder doppelt?** – Ins Leere: erstes E nach W/S an
  der Werkbank (F1), E direkt nach Dialogende (F9), Aufsammeln beim
  Weiterlaufen (F8), Nahkampf-Klicks aus kurzer Entfernung. Doppelt:
  Angriffsklick wählt Turm aus (F6). Wer beim Sessel die Leertaste spammt,
  landet immer auf „Weitermachen“. Das ist gewollt, aber so ruht man nie aus.

## Gesamturteil (1–10) und wichtigster Wunsch

**6/10.** Der Kreislauf Schrott holen → Leiste leuchtet → Turm hinstellen →
Nacht überleben → Bericht funktioniert und ist ohne Lesen verständlich. Das
Tower-Defense-Gefühl kommt aber nicht richtig auf, weil ich nachts nicht sehe,
was passiert, und die Nächte noch zu leicht sind.

**Wichtigster Wunsch:** Pfeile am Bildschirmrand für Schlurfer außerhalb vom
Bild (bzw. für die Richtung der Welle) und nachts deutlich bessere Sicht:
Schlurfer mit hellem Umriss, leuchtende Beute, Türme mit eigenem kleinen Licht.
Danach gerne mehr Druck ab Nacht 2.
