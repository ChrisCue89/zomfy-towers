// Wucht und Schliff (M26, OFFENE-FRAGEN 176): Was ein Treffer, ein Bau oder ein
// Durchbruch in Kamera, Zeit und Klang auslöst. Hier wird das Gefühl
// eingestellt, nicht im Code – gestaffelt nach Wucht (leicht, mittel, schwer).
//
//   stop    Trefferstopp in Sekunden: Die Welt hält kurz an. Nur bei Mikas eigenen
//           Treffern und bei großen Momenten – Türme halten nie das ganze Spiel an.
//   trauma  Stoß fürs Kamerawackeln (0..1, addiert sich; Ausschlag = Trauma²,
//           siehe SHAKE): 0,35 ≈ 1 px, 0,55 ≈ 2–3 px, 0,75 ≈ 4–6 px, 1 ≈ 6–10 px
//   kick    gerichteter Stoß in Pixeln (die Welt ruckt in Schlagrichtung)
//   slow    Zeitlupe in Sekunden (SLOWMO.scale)
//   bits    Partikel (klein 3–6, mittel 8–12, groß 16–30)

export const FEEL = {
  schlag: { stop: 0.05, trauma: 0.35, kick: 1, bits: 6 }, // ein gewöhnlicher Treffer
  schlagSchwer: { stop: 0.1, trauma: 0.5, kick: 2, bits: 12 }, // Kombo, Pfanne (betäubt)
  abschuss: { stop: 0.08, trauma: 0.42, kick: 1, bits: 10 }, // Mikas Schlag erledigt einen
  wirbel: { stop: 0.12, trauma: 0.55, kick: 0, bits: 8 }, // Rundumschlag
  autsch: { stop: 0.04, trauma: 0.55, kick: 2 }, // Mika wird getroffen (kurz: es passiert oft)
  blitz: { trauma: 0.3 }, // Laternenblitz
  kuerbis: { trauma: 0.45 }, // Kürbiswurf platzt
  barrikade: { trauma: 0.45 }, // eine Barrikade in Mikas Nähe bricht
  bossSchlag: { trauma: 0.75 }, // ein Boss schlägt zu (Hieb, Stampfer, Wurzeln)
  herz: { trauma: 0.8 }, // das Moderherz bricht aus dem Wald
  durchbruch: { trauma: 0.9 }, // Tor oder Wall fällt
  bossFaellt: { stop: 0.15, trauma: 0.75, slow: 0.4 },
  herzFaellt: { stop: 0.22, trauma: 1, slow: 0.6 },
  letzterSchlurfer: { slow: 0.45 }, // der letzte Schlurfer der Nacht fällt
  // M30: Schüsse – Rückstoß als gerichteter Stoß gegen die Schussrichtung; nur ein Treffer hält an
  schuss: { trauma: 0.3, kick: 1 }, // Pistole, Signalpistole
  schussSchwer: { trauma: 0.45, kick: 2 }, // Jagdgewehr, Doppelflinte
  schussTreffer: { stop: 0.04, trauma: 0.35, kick: 1, bits: 8 },
  schussSchwerTreffer: { stop: 0.07, trauma: 0.5, kick: 2, bits: 12 },
};

/**
 * Kamerawackeln (Trauma-Modell): Ausschlag = maxPx · Trauma² · Rauschen in ganzen
 * Szenenpixeln, ohne Drehung. Das Rauschen liegt meist um ±0,5 – maxPx ist die Spitze.
 */
export const SHAKE = {
  maxPx: 12,
  decay: 1.5, // Trauma je Sekunde
  freq: 24, // Hz des Rauschens
  kickDecay: 20, // wie schnell der gerichtete Stoß abklingt (je Sekunde)
  barricadeNear: 10, // m: weiter weg bricht eine Barrikade ohne Wackeln
};

/** Einstellung »Wackeln«: Faktor auf Ausschlag und Stoß. */
export const SHAKE_LEVELS = { aus: 0, halb: 0.5, voll: 1 };

/** Einstellung »Blitze«: so hell flammt der Laternenblitz auf (Vielfaches der Laterne). */
export const FLASH_LEVELS = { voll: 5, sanft: 1.5 };

/** Zeitlupe: So schnell läuft die Welt, solange sie dauert. */
export const SLOWMO = { scale: 0.3 };

/**
 * Bauen mit Schwung: Beim Aufsetzen staucht sich ein Bau und federt nach
 * (gedämpfte Schwingung, 0,85 → 1,1 → 1,0 in gut 0,3 s); Ausbauten federn höher.
 */
export const POP = { time: 0.5, squash: 0.16, upgrade: 0.22, freq: 4.6, damping: 7, widen: 0.6 };

/** Klang: Streuung je Effekt – Tonhöhe ±5 %, Lautstärke ±1,5 dB. */
export const SOUND_VARY = { pitch: 0.05, db: 1.5 };

/** Klänge mit fester Tonhöhe (Musikalisches und Oberfläche). */
export const SOUND_FIXED = ['glocke', 'bimmel', 'herzschlag', 'jubel', 'klick', 'tipp', 'welle', 'stufe', 'morgen', 'sturmglocke', 'turmglocke', 'champion', 'pfiff', 'loot', 'reaktion'];

/** Ausbau: Mit jeder Stufe klingt der Ausbau ein wenig höher. */
export const UPGRADE_PITCH = 0.07;
