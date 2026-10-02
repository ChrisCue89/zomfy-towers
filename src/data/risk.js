// Wagnis und Vorrat (M24, DESIGN 8; Vorbild: Element TD, Line Tower Wars):
// Mehr Einkommen nur durch Risiko. Hier wird balanciert.

/**
 * Moderlocke: auf einen Zulauf nahe dem Waldrand gelegt (westlich von `maxX`,
 * wo die Wege noch getrennt sind – der Zulauf bestimmt den Spawn). In der
 * nächsten Nacht lockt sie in jeder Welle zusätzlich rund `extra` der Welle
 * (mindestens `min`) über diesen Spawn heran; alles, was von dort kommt, trägt
 * `loot` mal so viel Beute. Hält die Nacht, wird die Locke zur Fundkiste. Die
 * Locke hält nur eine Nacht; es gibt sie, sobald `unlock` Nächte gewonnen sind.
 */
export const LURE = { maxX: -40, extra: 0.35, min: 2, loot: 1.6, unlock: 2 };

/**
 * Makellose Nacht: Kein Schlurfer kam ins Lager, das Zuhause blieb heil.
 * Dafür gibt es `reward`; nach `streak` in Folge bringt Balduin ein seltenes
 * Angebot (Balduins Schatz: ein Turmteil der Seltenheit `rarity` für `price`).
 */
export const FLAWLESS = { reward: { schrott: 12, teile: 4 }, streak: 3, rarity: 'einzigartig', price: { teile: 14 } };

/**
 * Vorratskammer: Gespartes Schrott wächst über Nacht um `rate` (abgerundet),
 * höchstens um `cap` – mit dem Lager im Haus (Stufe 5) um `capStore`. Nach einer
 * Nacht mit Durchbruch (oder einer verlorenen) wächst nichts.
 */
export const PANTRY = { rate: 0.06, cap: 12, capStore: 24 };
