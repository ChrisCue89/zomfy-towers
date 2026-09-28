// Nebenaufträge (M23, DESIGN 8): Die Überlebenden und Balduin bitten um Dinge.
// Jeder Auftrag kommt einmal, morgens (höchstens einer je Tag), sobald die
// Person da ist und ihr erster Auftrag (M6) erledigt ist. Belohnungen:
// Baupläne und Turmteile. Sie bleiben auch nach dem Finale.
//
//   fund      etwas finden und bringen: im Bootswrack (`where: 'wrack'`) oder
//             neben den Wegen (`where: 'weg'`, `count` Stück, feste Stellen aus
//             dem Startwert der Karte)
//   champion  `count` Champions erledigen (Proben für Dr. Yusuf)
//   bring     Vorrat abgeben (`give`)
// reward: blueprint = ein Bauplan zur Wahl; rarity = ein Turmteil dieser Seltenheit

export const QUEST_ORDER = ['garn', 'antenne', 'werkzeug', 'balduin', 'proben'];

export const QUESTS = {
  garn: { from: 'hilde', day: 4, kind: 'fund', where: 'wrack', count: 1, item: 'garnrollen', reward: { blueprint: true } },
  antenne: { from: 'juna', day: 5, kind: 'fund', where: 'weg', count: 3, item: 'antennenteil', reward: { rarity: 'besonders' } },
  werkzeug: { from: 'bert', day: 6, kind: 'fund', where: 'weg', count: 1, item: 'werkzeugkasten', reward: { rarity: 'selten', blueprint: true } },
  balduin: { from: 'balduin', day: 6, kind: 'bring', give: { moderkerne: 1, teile: 15 }, reward: { rarity: 'einzigartig' } },
  proben: { from: 'yusuf', day: 7, kind: 'champion', count: 2, reward: { rarity: 'besonders', blueprint: true } },
};

/** So weit links (x) liegen Fundstücke neben den Wegen mindestens – weg von der Bucht. */
export const QUEST_ITEM_MIN_X = -14;
