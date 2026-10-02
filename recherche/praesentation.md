# Die Präsentation am Anfang – wie ein Studio-Logo richtig läuft (N11)

Stand: 30.09.2026 · Auftrag: »am Anfang muss man das Tales of Cue weg drücken. Voll doof. Schau
mal wie so eine Präsentation richtig geht.«

## 1. Was bisher war (N2)

Das Startbild »Tales of Cue präsentiert« wartete auf eine Taste (»Taste drücken« blinkte). Erst
mit dem Druck spielte die Spieluhr, dann kam das Titelbild mit seiner Musik. Der Grund war
technisch: Browser erlauben Klang erst nach einer echten Eingabe (CLAUDE.md, Regel 5). Das Logo
diente deshalb als Tor für den Ton – und genau das stört.

## 2. Was gute Spiele machen

- **Logos laufen von selbst.** Einblenden, kurz stehen, ausblenden. Die übliche Etikette: Man
  wartet, bis sie verschwinden, oder drückt irgendeine Taste, um sie zu überspringen. Nie muss
  man eine Taste drücken, damit es weitergeht.
- **Kurz.** Handy-Apps zielen auf 1 bis 1,5 Sekunden. Studio-Logos in Spielen stehen meist zwei
  bis drei Sekunden. Künstliche Wartezeiten ärgern: Man sieht das Logo bei jedem Start.
- **Sofort überspringbar.** Jede Taste und jeder Klick gilt, ohne Verzögerung. Spieler haben
  sonst eigene Wege gefunden, Logos zu überspringen (Dateien umbenennen, Startparameter).
- **Nach dem ersten Mal weniger.** Die PS5 zeigt Studio-Logos nach dem ersten Start eines Spiels
  gar nicht mehr.
- **Ton im Browser.** Ein AudioContext darf erst laufen, wenn die Seite eine Eingabe hatte
  (»sticky activation«). Üblich ist:
  - Die Musik beginnt mit der ersten Eingabe, die der Spieler ohnehin macht.
  - Bis dahin zeigt ein stummer Lautsprecher, dass das Absicht ist.
  - `navigator.userActivation.hasBeenActive` sagt vorher, ob Klang schon erlaubt ist. Wer vorher
    nicht fragt, bekommt eine Warnung in der Konsole.
  - Ein »Klicken zum Starten« vor dem Spiel ist der Notbehelf mancher Web-Spiele – es ist genau
    das, was hier störte.

## 3. Was Zomfy Towers daraus macht

1. **Das Startbild läuft von selbst:**
   - aus dem Dunkel einblenden (0,7 s);
   - der Glanz nach 0,45 s: Die Laterne flammt auf, Funken steigen, ein Glanz läuft über
     »Tales of Cue«;
   - stehen bis 2,9 s, dann ausblenden (0,6 s).

   Nach rund 3,5 Sekunden ist das Titelbild da.
2. **Jede Taste und jeder Klick überspringen sofort** (0,25 s ausblenden). Die Eingabe weckt
   nebenbei den Ton, das Titelstück beginnt gleich.
3. **Beim zweiten Mal die kurze Fassung** (rund 1,6 s), gemerkt im Browser, nicht im Spielstand.
   Das Logo bleibt, aber es hält nicht auf – wer das Spiel oft neu lädt, merkt es kaum.
4. **Ton ohne Zwang:**
   - Hatte die Seite schon eine Eingabe, spielt die Spieluhr zum Glanz.
   - Sonst bleibt das Startbild still. Im Titelbild steht unten rechts neben einem stummen
     Lautsprecher: »Mit der ersten Taste beginnt die Musik.«
   - Die erste Taste dort startet das Titelstück und wählt zugleich im Menü; der Hinweis
     verschwindet.
5. **Kein »Taste drücken« mehr.** Der Text ist aus `texts.js` entfernt.

## Quellen

- UXPin: [Splash Screen Design: Best Practices](https://www.uxpin.com/studio/blog/splash-screen/)
- Game Developer: [Splash screens are wrong](https://www.gamedeveloper.com/design/splash-screens-are-wrong)
- Appy Pie: [App Splash Screen Best Practices: Cut It to 1.5s](https://www.appypie.com/blog/app-splash-screen-best-practices)
- Meta: [Splash screen best practices](https://developers.meta.com/horizon/design/mr-splash-screen-bp/)
- GameRant: [PS5 Lets Players Automatically Skip Studio Logos After First Boot-Up](https://gamerant.com/ps5-skip-studio-logos-first-boot/)
- Chrome: [Web Audio, Autoplay Policy and Games](https://developer.chrome.com/blog/web-audio-autoplay)
- MDN: [Audio for Web games](https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games)
- MDN: [UserActivation: hasBeenActive](https://developer.mozilla.org/en-US/docs/Web/API/UserActivation/hasBeenActive)
- itch.io: [Uploading HTML5 games](https://itch.io/docs/creators/html5)
- Bugnet: [How to Fix HTML5 Game Audio That Won't Play](https://bugnet.io/blog/how-to-fix-html5-game-audio-wont-play-autoplay)
