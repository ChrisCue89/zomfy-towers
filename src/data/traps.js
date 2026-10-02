// Fallen auf den Wegen (M19, DESIGN.md 8): anders als Barrikaden begehbar – die
// Horde läuft darüber und merkt es erst dann. Sie stehen nur auf Wegfeldern (eine
// je Feld, nie auf einer Barrikade), nutzen sich ab und werden tagsüber neu
// gerichtet (TRAP_REARM der Baukosten). Haltbarkeit und Kosten stehen in
// buildings.js.
//
//   stachelbrett   Wer darüberläuft, verletzt sich (damage, durch jede Panzerung);
//                  derselbe Schlurfer erst wieder nach `again` s. wear: Abnutzung je Tritt
//   leimtopf       klebt: bremst um slow, noch slowTime s nach dem Verlassen
//   knallerbsen    knallen einmal: Schaden im Umkreis (radius) und Betäubung – danach
//                  neu füllen
//   klettenteppich Kletten hängen lange (slowTime) und bremsen leicht
//   oelspur        rutschig (bremst leicht); kommt Feuer dazu – ein brennender Schlurfer
//                  oder ein Feuerkürbis –, brennt sie als Flammenwand (fire je Sekunde,
//                  fireTime s) und ist danach verbraucht

export const TRAPS = {
  stachelbrett: { damage: 12, again: 1.2, wear: 2 },
  leimtopf: { slow: 0.6, slowTime: 1.5, wear: 0.5 },
  knallerbsen: { damage: 22, radius: 1.4, stun: 1.2 },
  klettenteppich: { slow: 0.3, slowTime: 5, wear: 0.3 },
  oelspur: { slow: 0.15, slowTime: 0.5, fire: 14, fireTime: 5, radius: 0.9 },
};
export const TRAP_IDS = Object.keys(TRAPS);

/** Eine verbrauchte Falle neu richten kostet diesen Anteil der Baukosten (Flicken anteilig davon). */
export const TRAP_REARM = 0.5;
