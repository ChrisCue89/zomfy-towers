// A4: Die Kraniche vom Kranichsee. Im Oktober rasten sie hier auf dem Weg nach Süden – so steht
// es im Morgenbericht (G4) und in der Ortskunde (G5): »Über dem See rufen Kraniche. Hunderte.«
// Jetzt sieht und hört man sie auch: Keile ziehen morgens und am späten Nachmittag rufend über die
// Bucht, ein paar stehen tagsüber im flachen Wasser am Ufer und suchen nach Futter, tanzen
// manchmal, fliegen auf, wenn Mika zu nahe kommt, und schlafen nachts auf einem Bein im Wasser
// (»da kommt kein Fuchs hin«). Mit den Tagen werden es weniger; ab dem 29. sind sie fort.
// Verhalten in entities/cranes.js, Klang `kranich` in audio/sound.js.

/** Die Zugzeit: ab Tag `from`, am meisten von `peak[0]` bis `peak[1]`, weniger ab `fewer`, ab `gone` fort. */
export const CRANE_SEASON = { from: 1, peak: [3, 20], fewer: 24, gone: 29 };

/**
 * Ein Keil am Himmel: `times` die Stunden, in denen Keile ziehen (morgens und am späten
 * Nachmittag; die Keile des Tages verteilen sich darauf, morgens zuerst), `height` Flughöhe (m),
 * `speed` m/s, `size` Vögel je Keil, `spacing` Abstand im Keil (m), `call` Sekunden zwischen den
 * Rufen, `above` so viele Meter zieht er im Bild über Mika hinweg (die Mitte des Bilds bleibt frei),
 * `beat` Flügelschlag (rad/s).
 */
export const CRANE_FLOCK = { times: [[7.0, 9.6], [16.4, 18.3]], height: 8.5, speed: 4.2, size: [7, 13], spacing: 1.5, call: [1.4, 3.2], above: 2.4, beat: 7.5 };

/**
 * Die Rastenden: Stellen im flachen Wasser am Ufer (nördlich und südlich des Stegs), wie nah
 * Mika kommen darf (`shy`, m), Schritttempo, wie oft sie tanzen (Chance je Minute), wann sie
 * schlafen (`sleep`: Stunden) und wie tief sie im Wasser stehen (`wade`, m).
 */
export const CRANE_REST = {
  spots: [
    { z: -9.25, off: 0.9 }, // nördlich des Stegs, unterhalb des Hauses (x = Uferlinie + off)
    { z: 7.5, off: 1.0 }, // südlich, beim Bootswrack
  ],
  shy: 4.5,
  walk: 0.3,
  dance: 0.35,
  sleep: [19.2, 6.4],
  wade: 0.12,
  back: [40, 90], // so lange (s), bis sie nach dem Auffliegen zurückkommen
};

/** So nah muss Mika sein, damit ein Tanz, das Auffliegen oder die Schlafenden ein Gedanke werden (m). */
export const CRANE_NOTICE = { auf: 12, tanz: 14, schlaf: 8 };

/** In diesen Modi leben die Kraniche weiter (in der Nebelfahrt nicht: dort führt der Klang der Glocke). */
export const CRANE_MODES = ['play', 'foto', 'drachen', 'ankunft', 'rudern', 'angeln', 'karten'];

/** Wie viele Keile an diesem Tag über die Bucht ziehen (morgens und nachmittags zusammen). */
export function flocksOn(day) {
  const s = CRANE_SEASON;
  if (day < s.from || day >= s.gone) return 0;
  if (day >= s.fewer) return 1;
  if (day >= s.peak[0] && day <= s.peak[1]) return 4;
  return 2;
}

/** Wie viele Kraniche am Ufer rasten (verteilt auf die Stellen). */
export function restingOn(day) {
  const s = CRANE_SEASON;
  if (day < s.from || day >= s.gone) return 0;
  if (day >= s.fewer) return 2;
  if (day >= s.peak[0] && day <= s.peak[1]) return 5;
  return 3;
}
